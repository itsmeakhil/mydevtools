from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException, Response, status
from app.api.routes.auth.services import get_current_uid
from app.api.routes.workspaces.middleware import ACTIVE_WS_COOKIE
from app.api.routes.workspaces.repo import (
    find_user_workspaces, find_workspace, find_ws_membership,
)
from app.api.routes.workspaces.schema import (
    EncryptionBlob, KeypairOut, KeypairPostRequest, SetActiveWorkspaceRequest,
    SetActiveWorkspaceResponse, WorkspaceOut,
)
from app.api.routes.workspaces import crypto_repo
from app.core.config import get_settings

router = APIRouter(prefix="/workspaces-api", tags=["workspaces"])


def _ws_to_out(ws: dict) -> WorkspaceOut:
    return WorkspaceOut(
        id=ws["_id"],
        name=ws["name"],
        slug=ws["slug"],
        is_personal=bool(ws.get("is_personal")),
        kind=ws.get("kind", "personal"),
        ws_role=ws["ws_role"],
        settings=ws.get("settings") or {},
    )


@router.get("/workspaces", response_model=list[WorkspaceOut])
async def list_workspaces(
    uid: Annotated[str, Depends(get_current_uid)],
) -> list[WorkspaceOut]:
    workspaces = await find_user_workspaces(uid)
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
