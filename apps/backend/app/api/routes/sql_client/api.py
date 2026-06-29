from fastapi import APIRouter, Depends

from app.api.routes.sql_client.schema import (
    SqlConnectionCreate,
    SqlConnectionOut,
    SqlConnectionUpdate,
)
from app.api.routes.sql_client import services as svc
from app.api.routes.workspaces.middleware import WorkspaceContext
from app.api.routes.workspaces.rbac import require_permission

router = APIRouter(prefix="/sql-client", tags=["sql-client"])


@router.get(
    "/connections",
    response_model=list[SqlConnectionOut],
    summary="List saved SQL connections",
)
async def list_connections(ctx: WorkspaceContext = Depends(require_permission("sql-client", "read"))) -> list[SqlConnectionOut]:
    return await svc.list_connections(ctx)


@router.post(
    "/connections",
    response_model=SqlConnectionOut,
    summary="Save a new SQL connection",
)
async def create_connection(
    body: SqlConnectionCreate, ctx: WorkspaceContext = Depends(require_permission("sql-client", "write"))
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
    ctx: WorkspaceContext = Depends(require_permission("sql-client", "write")),
) -> SqlConnectionOut:
    return await svc.update_connection(ctx, connection_id, body)


@router.delete(
    "/connections/{connection_id}",
    status_code=204,
    summary="Delete a saved SQL connection",
)
async def delete_connection(
    connection_id: str, ctx: WorkspaceContext = Depends(require_permission("sql-client", "delete"))
) -> None:
    await svc.delete_connection(ctx, connection_id)


@router.post(
    "/connections/{connection_id}/touch",
    status_code=204,
    summary="Update lastUsedAt for a connection",
)
async def touch_connection(
    connection_id: str, ctx: WorkspaceContext = Depends(require_permission("sql-client", "write"))
) -> None:
    await svc.touch_connection(ctx, connection_id)
