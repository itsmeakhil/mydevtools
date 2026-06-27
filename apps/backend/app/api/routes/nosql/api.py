from fastapi import APIRouter, Depends

from app.api.routes.nosql.schema import ConnectionCreate, ConnectionOut, ConnectionUpdate
from app.api.routes.nosql import services as nosql_svc
from app.api.routes.workspaces.middleware import WorkspaceContext
from app.api.routes.workspaces.rbac import require_permission


router = APIRouter(prefix="/nosql", tags=["nosql"])


@router.get("/connections", response_model=list[ConnectionOut], summary="List saved MongoDB connections")
async def list_connections(ctx: WorkspaceContext = Depends(require_permission("nosql-explorer", "read"))) -> list[ConnectionOut]:
    return await nosql_svc.list_connections(ctx)


@router.post("/connections", response_model=ConnectionOut, summary="Save a connection")
async def save_connection(body: ConnectionCreate, ctx: WorkspaceContext = Depends(require_permission("nosql-explorer", "write"))) -> ConnectionOut:
    return await nosql_svc.create_connection(ctx, body)


@router.patch(
    "/connections/{connection_id}",
    response_model=ConnectionOut,
    summary="Update a saved connection",
)
async def update_connection(
    connection_id: str,
    body: ConnectionUpdate,
    ctx: WorkspaceContext = Depends(require_permission("nosql-explorer", "write")),
) -> ConnectionOut:
    return await nosql_svc.update_connection(ctx, connection_id, body)


@router.delete(
    "/connections/{connection_id}",
    status_code=204,
    summary="Delete a saved connection",
)
async def delete_connection(connection_id: str, ctx: WorkspaceContext = Depends(require_permission("nosql-explorer", "delete"))) -> None:
    await nosql_svc.delete_connection(ctx, connection_id)
