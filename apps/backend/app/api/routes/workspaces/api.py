from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from app.api.routes.auth.services import get_current_uid
from app.api.routes.workspaces import crud_service
from app.api.routes.workspaces.middleware import ACTIVE_WS_COOKIE
from app.api.routes.workspaces.repo import (
    find_user_orgs, find_user_workspaces, find_workspace, find_ws_membership,
)
from app.api.routes.workspaces.schema import (
    OrgCreate, OrgOut, OrgPatch, SetActiveWorkspaceRequest, SetActiveWorkspaceResponse,
    WorkspaceCreate, WorkspacePatch, WorkspaceOut,
)
from app.core.config import get_settings

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
