from fastapi import APIRouter, Depends

from app.api.routes.auth.services import get_current_uid
from app.api.routes.sql_client.schema import (
    SqlConnectionCreate,
    SqlConnectionOut,
    SqlConnectionUpdate,
)
from app.api.routes.sql_client import services as svc

router = APIRouter(prefix="/sql-client", tags=["sql-client"])


@router.get(
    "/connections",
    response_model=list[SqlConnectionOut],
    summary="List saved SQL connections",
)
def list_connections(uid: str = Depends(get_current_uid)) -> list[SqlConnectionOut]:
    return svc.list_connections(uid)


@router.post(
    "/connections",
    response_model=SqlConnectionOut,
    summary="Save a new SQL connection",
)
def create_connection(
    body: SqlConnectionCreate, uid: str = Depends(get_current_uid)
) -> SqlConnectionOut:
    return svc.create_connection(uid, body)


@router.patch(
    "/connections/{connection_id}",
    response_model=SqlConnectionOut,
    summary="Update a saved SQL connection",
)
def update_connection(
    connection_id: str,
    body: SqlConnectionUpdate,
    uid: str = Depends(get_current_uid),
) -> SqlConnectionOut:
    return svc.update_connection(uid, connection_id, body)


@router.delete(
    "/connections/{connection_id}",
    status_code=204,
    summary="Delete a saved SQL connection",
)
def delete_connection(
    connection_id: str, uid: str = Depends(get_current_uid)
) -> None:
    svc.delete_connection(uid, connection_id)


@router.post(
    "/connections/{connection_id}/touch",
    status_code=204,
    summary="Update lastUsedAt for a connection",
)
def touch_connection(
    connection_id: str, uid: str = Depends(get_current_uid)
) -> None:
    svc.touch_connection(uid, connection_id)
