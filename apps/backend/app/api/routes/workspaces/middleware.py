from __future__ import annotations

from typing import Annotated, Any

from fastapi import Depends, HTTPException, Request, status
from pydantic import BaseModel

from app.api.routes.auth.services import get_current_uid
from app.api.routes.workspaces.repo import (
    find_org_membership,
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
    # True once `workspaces.settings.encryption` is non-null. Flips the
    # encrypted-tool RBAC row from all-empty to plaintext-row.
    has_encryption: bool = False


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
        raise HTTPException(403, "No accessible workspace.")

    ws = await find_workspace(ws_id)
    if not ws:
        raise HTTPException(403, "Workspace not found.")

    mem = await find_ws_membership(ws_id, uid)
    if mem:
        ws_role = mem["ws_role"]
    else:
        org_mem = await find_org_membership(ws["org_id"], uid)
        if not org_mem or org_mem["org_role"] not in ("owner", "admin"):
            raise HTTPException(403, "Not a member of this workspace.")
        ws_role = "admin"   # implicit cascade

    enc_settings = (ws.get("settings") or {}).get("encryption")
    has_encryption = enc_settings is not None
    return WorkspaceContext(
        uid=uid,
        org_id=ws["org_id"],
        workspace_id=ws_id,
        ws_role=ws_role,
        is_personal=bool(ws.get("is_personal")),
        owner_uid=ws.get("owner_uid"),
        has_encryption=has_encryption,
    )


def apply_workspace_filter(
    ctx: WorkspaceContext, base_filter: dict[str, Any]
) -> dict[str, Any]:
    flt = {**base_filter, "org_id": ctx.org_id, "workspace_id": ctx.workspace_id}
    if ctx.is_personal:
        assert ctx.owner_uid is not None, (
            f"Personal workspace {ctx.workspace_id} has no owner_uid — "
            "data invariant violated"
        )
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
    workspace_or = {"$or": [stamped, legacy]}
    # If the base filter already carries its own $or (e.g. an "uncategorized"
    # field test), combine via $and so neither side is silently overwritten.
    if "$or" in base_filter:
        return {"$and": [base_filter, workspace_or]}
    return {**base_filter, "$or": [stamped, legacy]}
