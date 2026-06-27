import secrets
from fastapi import HTTPException

from app.api.routes.auth.users_repo import get_user_doc
from app.api.routes.workspaces import invitations_repo, repo
from app.api.routes.workspaces.schema import InvitationOut, InviteMemberRequest
from app.core.email import send_invitation_email
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
    now = create_timestamp()
    invited_uid = await _find_uid_by_email(email)
    doc = {
        "_id": new_id(),
        "org_id": org_id,
        "workspace_id": None,
        "invited_email": email,
        "invited_uid": invited_uid,
        "invited_role_org": body.role,
        "invited_role_ws": None,
        "token": _new_token(),
        "status": "pending",
        "invited_by": uid,
        "created_at": now,
        "expires_at": now + INVITATION_TTL_SECONDS * 1000,
    }
    await invitations_repo.create_invitation(doc)

    inviter = await get_user_doc(uid) or {}
    org = await repo.find_org(org_id) or {}
    await send_invitation_email(
        to=email,
        token=doc["token"],
        inviter_name=inviter.get("displayName") or inviter.get("email") or "A teammate",
        org_name=org.get("name", "an org"),
        workspace_name=None,
    )
    return _doc_to_out(doc)


async def invite_to_workspace(
    uid: str, ws_id: str, body: InviteMemberRequest,
) -> InvitationOut:
    ws = await _ensure_ws_admin(uid, ws_id)
    email = body.email.lower().strip()
    if body.role not in ("admin", "developer", "viewer"):
        raise HTTPException(400, "Invalid ws role")
    now = create_timestamp()
    invited_uid = await _find_uid_by_email(email)
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

    inviter = await get_user_doc(uid) or {}
    org = await repo.find_org(ws["org_id"]) or {}
    await send_invitation_email(
        to=email,
        token=doc["token"],
        inviter_name=inviter.get("displayName") or inviter.get("email") or "A teammate",
        org_name=org.get("name", "an org"),
        workspace_name=ws["name"],
    )
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
    await invitations_repo.update_invitation_status(
        inv["_id"], "accepted",
        accepted_uid=uid, accepted_at=create_timestamp(),
    )
    return {"org_id": inv["org_id"], "workspace_id": inv.get("workspace_id")}


async def revoke_invitation(uid: str, token: str) -> None:
    inv = await invitations_repo.find_invitation_by_token(token)
    if not inv:
        raise HTTPException(404, "Invitation not found")
    org_mem = await repo.find_org_membership(inv["org_id"], uid)
    if inv["invited_by"] != uid and not (
        org_mem and org_mem["org_role"] in ("owner", "admin")
    ):
        raise HTTPException(403, "Cannot revoke this invitation")
    if inv["status"] != "pending":
        return
    await invitations_repo.update_invitation_status(inv["_id"], "revoked")
