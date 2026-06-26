from fastapi import APIRouter, Depends

from app.api.routes.sql_client.schema import (
    SqlConnectionCreate,
    SqlConnectionOut,
    SqlConnectionUpdate,
)
from app.api.routes.sql_client import services as svc
from app.api.routes.workspaces.middleware import WorkspaceContext, get_workspace_ctx

router = APIRouter(prefix="/sql-client", tags=["sql-client"])


@router.get(
    "/connections",
    response_model=list[SqlConnectionOut],
    summary="List saved SQL connections",
)
async def list_connections(ctx: WorkspaceContext = Depends(get_workspace_ctx)) -> list[SqlConnectionOut]:
    return await svc.list_connections(ctx)


@router.post(
    "/connections",
    response_model=SqlConnectionOut,
    summary="Save a new SQL connection",
)
async def create_connection(
    body: SqlConnectionCreate, ctx: WorkspaceContext = Depends(get_workspace_ctx)
) -> SqlConnectionOut:
    return await svc.create_connection(ctx, body)


@router.patch(
    "/connections/{connection_id}",
    response_model=SqlConnectionOut,
    summary="Update a saved SQL connection",
)
async def update_connection(
    connection_id: str,
    body: SqlConnectionUpdate,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
) -> SqlConnectionOut:
    return await svc.update_connection(ctx, connection_id, body)


@router.delete(
    "/connections/{connection_id}",
    status_code=204,
    summary="Delete a saved SQL connection",
)
async def delete_connection(
    connection_id: str, ctx: WorkspaceContext = Depends(get_workspace_ctx)
) -> None:
    await svc.delete_connection(ctx, connection_id)


@router.post(
    "/connections/{connection_id}/touch",
    status_code=204,
    summary="Update lastUsedAt for a connection",
)
async def touch_connection(
    connection_id: str, ctx: WorkspaceContext = Depends(get_workspace_ctx)
) -> None:
    await svc.touch_connection(ctx, connection_id)
