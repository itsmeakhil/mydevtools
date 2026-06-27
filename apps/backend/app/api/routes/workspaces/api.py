from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from app.api.routes.auth.services import get_current_uid
from app.api.routes.workspaces import crud_service
from app.api.routes.workspaces.middleware import ACTIVE_WS_COOKIE
from app.api.routes.workspaces import repo
from app.api.routes.workspaces.repo import (
    find_user_orgs, find_user_workspaces, find_workspace, find_ws_membership,
    find_org_membership, find_workspace_members,
)
from app.api.routes.workspaces import members_service
from app.api.routes.workspaces import invitations_service
from app.api.routes.workspaces.schema import (
    ChangeRoleRequest, DekWrapOut, DekWrapPostRequest, EncryptionBlob, InvitationOut,
    InviteMemberRequest, KeypairOut, KeypairPostRequest, MemberOut, OrgCreate, OrgOut, OrgPatch,
    PendingWrapOut, RotateDekRequest, SetActiveWorkspaceRequest, SetActiveWorkspaceResponse,
    WorkspaceCreate, WorkspacePatch, WorkspaceOut, WrappedDekBlob,
)
from app.api.routes.workspaces import crypto_repo
from app.core.config import get_settings
from app.database import db_manager
from app.utils.collection_name import USERS

router = APIRouter(prefix="/workspaces-api", tags=["workspaces"])


def _org_to_out(org: dict) -> OrgOut:
    return OrgOut(
        id=org["_id"],
        name=org["name"],
        slug=org["slug"],
        kind=org["kind"],
        org_role=org["org_role"],
    )


def _ws_to_out(ws: dict) -> WorkspaceOut:
    return WorkspaceOut(
        id=ws["_id"],
        org_id=ws["org_id"],
        name=ws["name"],
        slug=ws["slug"],
        is_personal=bool(ws.get("is_personal")),
        kind=ws.get("kind", "personal"),
        ws_role=ws["ws_role"],
    )


@router.get("/orgs", response_model=list[OrgOut])
async def list_orgs(uid: Annotated[str, Depends(get_current_uid)]) -> list[OrgOut]:
    orgs = await find_user_orgs(uid)
    return [_org_to_out(o) for o in orgs]


@router.get("/workspaces", response_model=list[WorkspaceOut])
async def list_workspaces(
    uid: Annotated[str, Depends(get_current_uid)],
    org_id: str | None = Query(default=None),
) -> list[WorkspaceOut]:
    workspaces = await find_user_workspaces(uid, org_id=org_id)
    return [_ws_to_out(w) for w in workspaces]


@router.get("/workspaces/{workspace_id}", response_model=WorkspaceOut)
async def get_workspace(
    workspace_id: str,
    uid: Annotated[str, Depends(get_current_uid)],
) -> WorkspaceOut:
    ws = await find_workspace(workspace_id)
    mem = await find_ws_membership(workspace_id, uid)
    if not ws or not mem:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    return _ws_to_out({**ws, "ws_role": mem["ws_role"]})


@router.post("/workspaces/active", response_model=SetActiveWorkspaceResponse)
async def set_active_workspace(
    body: SetActiveWorkspaceRequest,
    response: Response,
    uid: Annotated[str, Depends(get_current_uid)],
) -> SetActiveWorkspaceResponse:
    mem = await find_ws_membership(body.workspace_id, uid)
    if not mem:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not a member of this workspace.",
        )
    settings = get_settings()
    response.set_cookie(
        key=ACTIVE_WS_COOKIE,
        value=body.workspace_id,
        httponly=True,
        samesite="lax",
        secure=settings.APP_ENV == "production",
        path="/",
    )
    return SetActiveWorkspaceResponse(workspace_id=body.workspace_id)


@router.post("/orgs", response_model=OrgOut, status_code=201)
async def create_org_route(
    body: OrgCreate,
    uid: Annotated[str, Depends(get_current_uid)],
) -> OrgOut:
    return await crud_service.create_org(uid, body)


@router.patch("/orgs/{org_id}", response_model=OrgOut)
async def rename_org_route(
    org_id: str,
    body: OrgPatch,
    uid: Annotated[str, Depends(get_current_uid)],
) -> OrgOut:
    return await crud_service.rename_org(uid, org_id, body)


@router.delete("/orgs/{org_id}", status_code=204)
async def delete_org_route(
    org_id: str,
    uid: Annotated[str, Depends(get_current_uid)],
) -> None:
    await crud_service.delete_org(uid, org_id)


@router.post(
    "/orgs/{org_id}/workspaces",
    response_model=WorkspaceOut,
    status_code=201,
)
async def create_workspace_route(
    org_id: str,
    body: WorkspaceCreate,
    uid: Annotated[str, Depends(get_current_uid)],
) -> WorkspaceOut:
    return await crud_service.create_shared_workspace(uid, org_id, body)


@router.patch("/workspaces/{ws_id}", response_model=WorkspaceOut)
async def rename_workspace_route(
    ws_id: str,
    body: WorkspacePatch,
    uid: Annotated[str, Depends(get_current_uid)],
) -> WorkspaceOut:
    return await crud_service.rename_workspace(uid, ws_id, body)


@router.delete("/workspaces/{ws_id}", status_code=204)
async def delete_workspace_route(
    ws_id: str,
    uid: Annotated[str, Depends(get_current_uid)],
) -> None:
    await crud_service.delete_workspace(uid, ws_id)


@router.get("/orgs/{org_id}/members", response_model=list[MemberOut])
async def list_org_members_route(
    org_id: str, uid: Annotated[str, Depends(get_current_uid)],
) -> list[MemberOut]:
    return await members_service.list_org_members(uid, org_id)


@router.patch("/orgs/{org_id}/members/{target_uid}", response_model=MemberOut)
async def change_org_role_route(
    org_id: str, target_uid: str, body: ChangeRoleRequest,
    uid: Annotated[str, Depends(get_current_uid)],
) -> MemberOut:
    return await members_service.change_org_role(uid, org_id, target_uid, body.role)


@router.delete("/orgs/{org_id}/members/{target_uid}", status_code=204)
async def remove_org_member_route(
    org_id: str, target_uid: str,
    uid: Annotated[str, Depends(get_current_uid)],
) -> None:
    await members_service.remove_org_member(uid, org_id, target_uid)


@router.get("/workspaces/{ws_id}/members", response_model=list[MemberOut])
async def list_workspace_members_route(
    ws_id: str, uid: Annotated[str, Depends(get_current_uid)],
) -> list[MemberOut]:
    return await members_service.list_workspace_members(uid, ws_id)


@router.patch("/workspaces/{ws_id}/members/{target_uid}", response_model=MemberOut)
async def change_workspace_role_route(
    ws_id: str, target_uid: str, body: ChangeRoleRequest,
    uid: Annotated[str, Depends(get_current_uid)],
) -> MemberOut:
    return await members_service.change_workspace_role(uid, ws_id, target_uid, body.role)


@router.delete("/workspaces/{ws_id}/members/{target_uid}", status_code=204)
async def remove_workspace_member_route(
    ws_id: str, target_uid: str,
    uid: Annotated[str, Depends(get_current_uid)],
) -> None:
    await members_service.remove_workspace_member(uid, ws_id, target_uid)


@router.post(
    "/orgs/{org_id}/members",
    response_model=InvitationOut, status_code=201,
)
async def invite_to_org_route(
    org_id: str, body: InviteMemberRequest,
    uid: Annotated[str, Depends(get_current_uid)],
) -> InvitationOut:
    return await invitations_service.invite_to_org(uid, org_id, body)


@router.post(
    "/workspaces/{ws_id}/members",
    response_model=InvitationOut, status_code=201,
)
async def invite_to_workspace_route(
    ws_id: str, body: InviteMemberRequest,
    uid: Annotated[str, Depends(get_current_uid)],
) -> InvitationOut:
    return await invitations_service.invite_to_workspace(uid, ws_id, body)


@router.get("/invitations/pending", response_model=list[InvitationOut])
async def list_pending_invitations_route(
    uid: Annotated[str, Depends(get_current_uid)],
) -> list[InvitationOut]:
    return await invitations_service.list_pending_for_me(uid)


@router.post("/invitations/{token}/accept")
async def accept_invitation_route(
    token: str, uid: Annotated[str, Depends(get_current_uid)],
) -> dict:
    return await invitations_service.accept_invitation(uid, token)


@router.post("/invitations/{token}/revoke", status_code=204)
async def revoke_invitation_route(
    token: str, uid: Annotated[str, Depends(get_current_uid)],
) -> None:
    await invitations_service.revoke_invitation(uid, token)


@router.get("/users/me/keypair", response_model=KeypairOut | None)
async def get_my_keypair(
    uid: Annotated[str, Depends(get_current_uid)],
) -> KeypairOut | None:
    enc = await crypto_repo.get_user_encryption(uid)
    if not enc:
        return None
    return KeypairOut(
        publicKey=enc["publicKey"],
        privateKeyEncrypted=EncryptionBlob(
            encrypted=enc["privateKeyEncrypted"]["encrypted"],
            iv=enc["privateKeyEncrypted"]["iv"],
        ),
        salt=enc["salt"],
        createdAt=int(enc.get("createdAt", 0)),
    )


@router.post("/users/me/keypair", status_code=204)
async def set_my_keypair(
    body: KeypairPostRequest,
    uid: Annotated[str, Depends(get_current_uid)],
) -> None:
    await crypto_repo.set_user_encryption(
        uid,
        public_key=body.publicKey,
        private_key_encrypted={
            "encrypted": body.privateKeyEncrypted.encrypted,
            "iv": body.privateKeyEncrypted.iv,
        },
        salt=body.salt,
    )


@router.get("/workspaces/{ws_id}/dek-wrap", response_model=DekWrapOut)
async def get_my_dek_wrap(
    ws_id: str,
    uid: Annotated[str, Depends(get_current_uid)],
) -> DekWrapOut:
    ws = await find_workspace(ws_id)
    if not ws:
        raise HTTPException(404)
    mem = await find_ws_membership(ws_id, uid)
    if not mem:
        raise HTTPException(403)
    wrap = mem.get("wrappedDek")
    return DekWrapOut(
        wrappedDek=WrappedDekBlob(**wrap) if wrap else None,
        wrappedDekVersion=mem.get("wrappedDekVersion", 0),
    )


@router.post("/workspaces/{ws_id}/dek-wrap", status_code=204)
async def post_dek_wrap_for_member(
    ws_id: str,
    body: DekWrapPostRequest,
    uid: Annotated[str, Depends(get_current_uid)],
) -> None:
    ws = await find_workspace(ws_id)
    if not ws:
        raise HTTPException(404)
    caller_mem = await find_ws_membership(ws_id, uid)
    org_mem = await find_org_membership(ws["org_id"], uid) if ws.get("org_id") else None
    is_admin = (caller_mem and caller_mem["ws_role"] == "admin") or (org_mem and org_mem["org_role"] in ("owner", "admin"))
    if not is_admin:
        raise HTTPException(403)
    existing = await crypto_repo.get_membership_wrap(ws_id, body.target_uid)
    new_version = (existing["wrappedDekVersion"] if existing else 0) + 1
    await crypto_repo.set_membership_wrapped_dek(
        ws_id,
        body.target_uid,
        wrapped={
            "encrypted": body.wrapped.encrypted,
            "iv": body.wrapped.iv,
            "senderPublicKey": body.wrapped.senderPublicKey,
        },
        version=new_version,
    )


@router.post("/workspaces/{ws_id}/rotate-dek", status_code=204)
async def rotate_dek(
    ws_id: str,
    body: RotateDekRequest,
    uid: Annotated[str, Depends(get_current_uid)],
) -> None:
    from app.utils.utils import create_timestamp
    ws = await find_workspace(ws_id)
    if not ws:
        raise HTTPException(404)
    caller_mem = await find_ws_membership(ws_id, uid)
    org_mem = await find_org_membership(ws["org_id"], uid) if ws.get("org_id") else None
    is_admin = (caller_mem and caller_mem["ws_role"] == "admin") or (org_mem and org_mem["org_role"] in ("owner", "admin"))
    if not is_admin:
        raise HTTPException(403)
    members = await find_workspace_members(ws_id)
    member_uids = {m["uid"] for m in members}
    submitted_uids = {w.uid for w in body.wraps}
    if submitted_uids != member_uids:
        raise HTTPException(400, "Wraps must cover all current members exactly")
    max_existing = max([m.get("wrappedDekVersion", 0) for m in members] + [0])
    new_version = max_existing + 1
    await crypto_repo.bulk_set_wrapped_deks(
        ws_id,
        [
            {
                "uid": w.uid,
                "wrapped": {
                    "encrypted": w.wrapped.encrypted,
                    "iv": w.wrapped.iv,
                    "senderPublicKey": w.wrapped.senderPublicKey,
                },
                "version": new_version,
            }
            for w in body.wraps
        ],
    )
    await crypto_repo.set_workspace_encryption(
        ws_id,
        scheme="shared-dek-v1",
        dek_fingerprint=body.dekFingerprint,
        rotated_at=create_timestamp(),
    )


@router.get("/workspaces/{ws_id}/pending-wraps", response_model=list[PendingWrapOut])
async def list_pending_wraps(
    ws_id: str,
    uid: Annotated[str, Depends(get_current_uid)],
) -> list[PendingWrapOut]:
    ws = await find_workspace(ws_id)
    if not ws:
        raise HTTPException(404)
    caller_mem = await find_ws_membership(ws_id, uid)
    if not caller_mem:
        raise HTTPException(403)
    pendings = await crypto_repo.find_pending_wraps(ws_id)
    if not pendings:
        return []
    uids = [p["uid"] for p in pendings]
    users = await db_manager.find(USERS, {"_id": {"$in": uids}}, limit=200)
    by_uid = {u["_id"]: u for u in users}
    return [
        PendingWrapOut(
            uid=p["uid"],
            email=by_uid.get(p["uid"], {}).get("email"),
            publicKey=(by_uid.get(p["uid"], {}).get("encryption") or {}).get("publicKey"),
        )
        for p in pendings
    ]
