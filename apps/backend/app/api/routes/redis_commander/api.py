from fastapi import APIRouter, Depends

from app.api.routes.auth.services import get_current_uid
from app.api.routes.redis_commander.schema import (
    RedisConnectionCreate,
    RedisConnectionOut,
    RedisConnectionUpdate,
)
from app.api.routes.redis_commander import services as svc

router = APIRouter(prefix="/redis-commander", tags=["redis-commander"])


@router.get(
    "/connections",
    response_model=list[RedisConnectionOut],
    summary="List saved Redis connections",
)
async def list_connections(uid: str = Depends(get_current_uid)) -> list[RedisConnectionOut]:
    return await svc.list_connections(uid)


@router.post(
    "/connections",
    response_model=RedisConnectionOut,
    summary="Save a new Redis connection",
)
async def create_connection(
    body: RedisConnectionCreate, uid: str = Depends(get_current_uid)
) -> RedisConnectionOut:
    return await svc.create_connection(uid, body)


@router.patch(
    "/connections/{connection_id}",
    response_model=RedisConnectionOut,
    summary="Update a saved Redis connection",
)
async def update_connection(
    connection_id: str,
    body: RedisConnectionUpdate,
    uid: str = Depends(get_current_uid),
) -> RedisConnectionOut:
    return await svc.update_connection(uid, connection_id, body)


@router.delete(
    "/connections/{connection_id}",
    status_code=204,
    summary="Delete a saved Redis connection",
)
async def delete_connection(
    connection_id: str, uid: str = Depends(get_current_uid)
) -> None:
    await svc.delete_connection(uid, connection_id)


@router.post(
    "/connections/{connection_id}/touch",
    status_code=204,
    summary="Update lastUsedAt for a connection",
)
async def touch_connection(
    connection_id: str, uid: str = Depends(get_current_uid)
) -> None:
    await svc.touch_connection(uid, connection_id)
