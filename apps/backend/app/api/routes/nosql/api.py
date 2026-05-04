from fastapi import APIRouter, Depends

from app.api.routes.auth.services import get_current_uid
from app.api.routes.nosql.schema import ConnectionCreate, ConnectionOut, ConnectionUpdate
from app.api.routes.nosql import services as nosql_svc


router = APIRouter(prefix="/nosql", tags=["nosql"])


@router.get("/connections", response_model=list[ConnectionOut], summary="List saved MongoDB connections")
async def list_connections(uid: str = Depends(get_current_uid)) -> list[ConnectionOut]:
    return await nosql_svc.list_connections(uid)


@router.post("/connections", response_model=ConnectionOut, summary="Save (upsert) a connection")
async def save_connection(body: ConnectionCreate, uid: str = Depends(get_current_uid)) -> ConnectionOut:
    return await nosql_svc.upsert_connection(uid, body)


@router.patch(
    "/connections/{connection_id}",
    response_model=ConnectionOut,
    summary="Update a saved connection",
)
async def update_connection(
    connection_id: str,
    body: ConnectionUpdate,
    uid: str = Depends(get_current_uid),
) -> ConnectionOut:
    return await nosql_svc.update_connection(uid, connection_id, body)


@router.delete(
    "/connections/{connection_id}",
    status_code=204,
    summary="Delete a saved connection",
)
async def delete_connection(connection_id: str, uid: str = Depends(get_current_uid)) -> None:
    await nosql_svc.delete_connection(uid, connection_id)
