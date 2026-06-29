import secrets
from fastapi import HTTPException

from app.api.routes.auth.users_repo import get_user_doc
from app.api.routes.workspaces import invitations_repo, repo
from app.api.routes.workspaces.schema import InvitationOut, InviteMemberRequest
from app.utils.utils import create_timestamp, new_id

INVITATION_TTL_SECONDS = 14 * 24 * 3600


def _new_token() -> str:
    return secrets.token_urlsafe(32)


def _doc_to_out(doc: dict) -> InvitationOut:
    return InvitationOut(
        id=doc["_id"],
        org_id=doc["org_id"],
        workspace_id=doc.get("workspace_id"),
        invited_email=doc["invited_email"],
        invited_uid=doc.get("invited_uid"),
        invited_role_org=doc.get("invited_role_org"),
        invited_role_ws=doc.get("invited_role_ws"),
        status=doc["status"],
        token=doc["token"],
        expires_at=int(doc["expires_at"]),
        created_at=int(doc["created_at"]),
    )


async def _find_uid_by_email(email: str) -> str | None:
    from app.database import db_manager
    from app.utils.collection_name import USERS
    doc = await db_manager.find_one(USERS, {"email": email.lower()})
    return doc["_id"] if doc else None


async def _ensure_org_admin(uid: str, org_id: str) -> None:
    mem = await repo.find_org_membership(org_id, uid)
    if not mem or mem["org_role"] not in ("owner", "admin"):
        raise HTTPException(403, "Org admin required")


async def _ensure_ws_admin(uid: str, ws_id: str) -> dict:
    ws = await repo.find_workspace(ws_id)
    if not ws:
        raise HTTPException(404, "Workspace not found")
    org_mem = await repo.find_org_membership(ws["org_id"], uid)
    ws_mem = await repo.find_ws_membership(ws_id, uid)
    if not (
        (org_mem and org_mem["org_role"] in ("owner", "admin"))
        or (ws_mem and ws_mem["ws_role"] == "admin")
    ):
        raise HTTPException(403, "Workspace admin required")
    return ws


async def invite_to_org(
    uid: str, org_id: str, body: InviteMemberRequest,
) -> InvitationOut:
    await _ensure_org_admin(uid, org_id)
    email = body.email.lower().strip()
    if body.role not in ("owner", "admin", "member", "viewer"):
        raise HTTPException(400, "Invalid org role")
    # Optional bundled workspace grant on accept.
    ws_id: str | None = body.workspace_id
    ws_role: str | None = body.workspace_role
    if ws_id:
        if ws_role not in ("admin", "developer", "viewer"):
            raise HTTPException(400, "Invalid workspace role")
        ws = await repo.find_workspace(ws_id)
        if not ws or ws.get("org_id") != org_id:
            raise HTTPException(400, "Workspace does not belong to this org")
    invited_uid = await _find_uid_by_email(email)
    if not invited_uid:
        raise HTTPException(404, "No user found with that email. Ask them to sign up first.")
    now = create_timestamp()
    doc = {
        "_id": new_id(),
        "org_id": org_id,
        "workspace_id": ws_id,
        "invited_email": email,
        "invited_uid": invited_uid,
        "invited_role_org": body.role,
        "invited_role_ws": ws_role,
        "token": _new_token(),
        "status": "pending",
        "invited_by": uid,
        "created_at": now,
        "expires_at": now + INVITATION_TTL_SECONDS * 1000,
    }
    await invitations_repo.create_invitation(doc)
    # In-app notification only — the invited user sees this via the bell.
    return _doc_to_out(doc)


async def invite_to_workspace(
    uid: str, ws_id: str, body: InviteMemberRequest,
) -> InvitationOut:
    ws = await _ensure_ws_admin(uid, ws_id)
    email = body.email.lower().strip()
    if body.role not in ("admin", "developer", "viewer"):
        raise HTTPException(400, "Invalid ws role")
    invited_uid = await _find_uid_by_email(email)
    if not invited_uid:
        raise HTTPException(404, "No user found with that email. Ask them to sign up first.")
    now = create_timestamp()
    doc = {
        "_id": new_id(),
        "org_id": ws["org_id"],
        "workspace_id": ws_id,
        "invited_email": email,
        "invited_uid": invited_uid,
        # Workspace-level invites also grant org Member by default.
        "invited_role_org": "member",
        "invited_role_ws": body.role,
        "token": _new_token(),
        "status": "pending",
        "invited_by": uid,
        "created_at": now,
        "expires_at": now + INVITATION_TTL_SECONDS * 1000,
    }
    await invitations_repo.create_invitation(doc)
    # In-app notification only — the invited user sees this via PendingInvitationsBadge.
    return _doc_to_out(doc)


async def list_pending_for_me(uid: str) -> list[InvitationOut]:
    user = await get_user_doc(uid)
    if not user or not user.get("email"):
        return []
    docs = await invitations_repo.find_pending_for_email(user["email"])
    return [_doc_to_out(d) for d in docs]


async def accept_invitation(uid: str, token: str) -> dict:
    inv = await invitations_repo.find_invitation_by_token(token)
    if not inv:
        raise HTTPException(404, "Invitation not found")
    user = await get_user_doc(uid)
    if not user or not user.get("email") or user["email"].lower() != inv["invited_email"]:
        raise HTTPException(403, "Invitation addressed to different email")
    if inv["status"] != "pending":
        raise HTTPException(400, f"Invitation is {inv['status']}")
    if inv["expires_at"] < create_timestamp():
        await invitations_repo.update_invitation_status(inv["_id"], "expired")
        raise HTTPException(400, "Invitation expired")

    # Apply memberships
    if inv["invited_role_org"]:
        existing = await repo.find_org_membership(inv["org_id"], uid)
        if not existing:
            await repo.upsert_org_membership(
                inv["org_id"], uid, inv["invited_role_org"],
            )
    if inv["workspace_id"] and inv["invited_role_ws"]:
        existing_ws = await repo.find_ws_membership(inv["workspace_id"], uid)
        if not existing_ws:
            await repo.upsert_ws_membership(
                inv["workspace_id"], inv["org_id"], uid, inv["invited_role_ws"],
            )
    else:
        # Org-only invite: seed a Personal workspace in this org so the user has
        # somewhere to land when they switch to it. Mirrors signup behavior.
        ws_id = await repo.upsert_personal_workspace(inv["org_id"], uid)
        await repo.upsert_ws_membership(ws_id, inv["org_id"], uid, "admin")
    await invitations_repo.update_invitation_status(
        inv["_id"], "accepted",
        accepted_uid=uid, accepted_at=create_timestamp(),
    )
    return {"org_id": inv["org_id"], "workspace_id": inv.get("workspace_id")}


async def revoke_invitation(uid: str, token: str) -> None:
    inv = await invitations_repo.find_invitation_by_token(token)
    if not inv:
        raise HTTPException(404, "Invitation not found")
    # Allowed: original inviter, org owner/admin, OR the invitee themself (decline).
    user = await get_user_doc(uid)
    is_invitee = bool(
        (inv.get("invited_uid") and inv["invited_uid"] == uid)
        or (user and (user.get("email") or "").lower() == inv["invited_email"])
    )
    org_mem = await repo.find_org_membership(inv["org_id"], uid)
    is_admin = bool(org_mem and org_mem["org_role"] in ("owner", "admin"))
    if not (inv["invited_by"] == uid or is_admin or is_invitee):
        raise HTTPException(403, "Cannot revoke this invitation")
    if inv["status"] != "pending":
        return
    await invitations_repo.update_invitation_status(inv["_id"], "revoked")
