
from fastapi import APIRouter, Depends, Query

from app.api.routes.environment_manager import services as env_svc
from app.api.routes.environment_manager.schema import (
    EnvSetEntryCreate,
    EnvSetEntryOut,
    EnvSetEntryUpdate,
)
from app.api.routes.workspaces.middleware import WorkspaceContext, get_workspace_ctx

router = APIRouter(prefix="/environment-manager", tags=["environment-manager"])


@router.get(
    "/entries",
    response_model=list[EnvSetEntryOut],
    summary="List encrypted environment sets (per project / environment)",
)
async def list_entries(
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    limit: int | None = Query(default=None, ge=1, le=1000),
    offset: int = Query(default=0, ge=0),
) -> list[EnvSetEntryOut]:
    return await env_svc.list_entries(ctx, limit=limit, offset=offset)


@router.post(
    "/entries",
    response_model=EnvSetEntryOut,
    summary="Create environment set (encrypted blob)",
)
async def create_entry(body: EnvSetEntryCreate, ctx: WorkspaceContext = Depends(get_workspace_ctx)) -> EnvSetEntryOut:
    return await env_svc.create_entry(ctx, body)


@router.get(
    "/entries/{entry_id}",
    response_model=EnvSetEntryOut,
    summary="Get one environment set",
)
async def get_entry(entry_id: str, ctx: WorkspaceContext = Depends(get_workspace_ctx)) -> EnvSetEntryOut:
    return await env_svc.get_entry(ctx=ctx, entry_id=entry_id)


@router.patch(
    "/entries/{entry_id}",
    response_model=EnvSetEntryOut,
    summary="Update environment set (encrypted blob)",
)
async def patch_entry(
    entry_id: str,
    body: EnvSetEntryUpdate,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
) -> EnvSetEntryOut:
    return await env_svc.update_entry(ctx, entry_id, body)


@router.delete(
    "/entries/{entry_id}",
    status_code=204,
    summary="Delete environment set",
)
async def delete_entry(entry_id: str, ctx: WorkspaceContext = Depends(get_workspace_ctx)) -> None:
    await env_svc.delete_entry(ctx, entry_id)
