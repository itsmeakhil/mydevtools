from fastapi import APIRouter, Depends

from app.api.routes.redis_commander.schema import (
    RedisConnectionCreate,
    RedisConnectionOut,
    RedisConnectionUpdate,
)
from app.api.routes.redis_commander import services as svc
from app.api.routes.workspaces.middleware import WorkspaceContext, get_workspace_ctx

router = APIRouter(prefix="/redis-commander", tags=["redis-commander"])


@router.get(
    "/connections",
    response_model=list[RedisConnectionOut],
    summary="List saved Redis connections",
)
async def list_connections(ctx: WorkspaceContext = Depends(get_workspace_ctx)) -> list[RedisConnectionOut]:
    return await svc.list_connections(ctx)


@router.post(
    "/connections",
    response_model=RedisConnectionOut,
    summary="Save a new Redis connection",
)
async def create_connection(
    body: RedisConnectionCreate, ctx: WorkspaceContext = Depends(get_workspace_ctx)
) -> RedisConnectionOut:
    return await svc.create_connection(ctx, body)


@router.patch(
    "/connections/{connection_id}",
    response_model=RedisConnectionOut,
    summary="Update a saved Redis connection",
)
async def update_connection(
    connection_id: str,
    body: RedisConnectionUpdate,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
) -> RedisConnectionOut:
    return await svc.update_connection(ctx, connection_id, body)


@router.delete(
    "/connections/{connection_id}",
    status_code=204,
    summary="Delete a saved Redis connection",
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
