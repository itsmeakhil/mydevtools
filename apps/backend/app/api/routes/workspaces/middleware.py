from __future__ import annotations

from typing import Annotated, Any

from fastapi import Depends, HTTPException, Request, status
from pydantic import BaseModel

from app.api.routes.auth.services import get_current_uid
from app.api.routes.workspaces.repo import (
    find_user_workspaces,
    find_workspace,
    find_ws_membership,
)
from app.api.routes.workspaces.schema import WsRole

ACTIVE_WS_COOKIE = "active_workspace"


class WorkspaceContext(BaseModel):
    uid: str
    org_id: str
    workspace_id: str
    ws_role: WsRole
    is_personal: bool
    owner_uid: str | None = None


async def default_personal_ws_id(uid: str) -> str | None:
    workspaces = await find_user_workspaces(uid)
    for w in workspaces:
        if w.get("is_personal"):
            return w["_id"]
    return None


async def get_workspace_ctx(
    request: Request,
    uid: Annotated[str, Depends(get_current_uid)],
) -> WorkspaceContext:
    ws_id = request.cookies.get(ACTIVE_WS_COOKIE)
    if not ws_id:
        ws_id = await default_personal_ws_id(uid)
    if not ws_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No accessible workspace.",
        )

    mem = await find_ws_membership(ws_id, uid)
    if not mem:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not a member of this workspace.",
        )

    ws = await find_workspace(ws_id)
    if not ws:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Workspace not found.",
        )

    return WorkspaceContext(
        uid=uid,
        org_id=ws["org_id"],
        workspace_id=ws_id,
        ws_role=mem["ws_role"],
        is_personal=bool(ws.get("is_personal")),
        owner_uid=ws.get("owner_uid"),
    )


def apply_workspace_filter(
    ctx: WorkspaceContext, base_filter: dict[str, Any]
) -> dict[str, Any]:
    flt = {**base_filter, "org_id": ctx.org_id, "workspace_id": ctx.workspace_id}
    if ctx.is_personal:
        flt["owner_uid"] = ctx.uid
    return flt


def apply_legacy_or_filter(
    ctx: WorkspaceContext,
    base_filter: dict[str, Any],
    *,
    user_field: str,
) -> dict[str, Any]:
    """Read-path tolerance during pending backfill.

    ponytail: transitional OR-branch. Remove in a follow-up PR after all
    live users have user.migrated_at set. The OR is bounded by `user_field`
    so it cannot leak across users.
    """
    stamped: dict[str, Any] = {
        "org_id": ctx.org_id,
        "workspace_id": ctx.workspace_id,
    }
    if ctx.is_personal:
        stamped["owner_uid"] = ctx.uid
    legacy: dict[str, Any] = {
        "workspace_id": {"$exists": False},
        user_field: ctx.uid,
    }
    return {**base_filter, "$or": [stamped, legacy]}
