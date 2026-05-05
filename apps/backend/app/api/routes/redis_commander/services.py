from typing import Any

from fastapi import HTTPException, status
from pymongo.errors import PyMongoError

from app.api.routes.redis_commander.schema import (
    RedisConnectionCreate,
    RedisConnectionOut,
    RedisConnectionUpdate,
)
from app.utils.collection_name import REDIS_CONNECTIONS
from app.utils.utils import create_timestamp, new_id
from app.database import db_manager


def _doc_to_out(doc: dict[str, Any], *, connection_id: str) -> RedisConnectionOut:
    created_at = int(doc.get("createdAt", 0)) or create_timestamp()
    last_used_at = int(doc.get("lastUsedAt", 0)) or created_at
    return RedisConnectionOut(
        id=connection_id,
        userId=str(doc.get("created_by", "")),
        encryptedData=str(doc.get("encryptedData", "")),
        iv=str(doc.get("iv", "")),
        name=str(doc.get("name", "")),
        createdAt=created_at,
        lastUsedAt=last_used_at,
    )


async def list_connections(uid: str) -> list[RedisConnectionOut]:
    docs = await db_manager.find(
        REDIS_CONNECTIONS,
        {"created_by": uid, "encryptedData": {"$exists": True}, "iv": {"$exists": True}},
        sort=[("lastUsedAt", -1), ("createdAt", -1)],
    )
    return [_doc_to_out(doc, connection_id=str(doc.get("_id", ""))) for doc in docs]


async def create_connection(uid: str, body: RedisConnectionCreate) -> RedisConnectionOut:
    ts = create_timestamp()
    _id = new_id()
    doc: dict[str, Any] = {
        "_id": _id,
        "created_by": uid,
        "encryptedData": body.encryptedData,
        "iv": body.iv,
        "name": body.name or "My Redis Connection",
        "createdAt": ts,
        "lastUsedAt": ts,
    }
    try:
        await db_manager.insert_one(REDIS_CONNECTIONS, doc)
    except PyMongoError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create connection.",
        ) from exc
    return _doc_to_out(doc, connection_id=_id)


async def update_connection(uid: str, connection_id: str, body: RedisConnectionUpdate) -> RedisConnectionOut:
    existing = await db_manager.find_one(REDIS_CONNECTIONS, {"_id": connection_id, "created_by": uid})
    if not existing:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Connection not found.")

    ts = create_timestamp()
    patch: dict[str, Any] = {"lastUsedAt": ts}
    if body.encryptedData is not None:
        patch["encryptedData"] = body.encryptedData
    if body.iv is not None:
        patch["iv"] = body.iv
    if body.name is not None:
        patch["name"] = body.name

    try:
        await db_manager.update_one(
            REDIS_CONNECTIONS,
            {"_id": connection_id, "created_by": uid},
            {"$set": patch},
        )
    except PyMongoError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update connection.",
        ) from exc

    updated = await db_manager.find_one(REDIS_CONNECTIONS, {"_id": connection_id, "created_by": uid})
    if not updated:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Connection not found.")
    return _doc_to_out(updated, connection_id=connection_id)


async def delete_connection(uid: str, connection_id: str) -> None:
    res = await db_manager.delete_one(REDIS_CONNECTIONS, {"_id": connection_id, "created_by": uid})
    if res.deleted_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Connection not found.")


async def touch_connection(uid: str, connection_id: str) -> None:
    await db_manager.update_one(
        REDIS_CONNECTIONS,
        {"_id": connection_id, "created_by": uid},
        {"$set": {"lastUsedAt": create_timestamp()}},
    )
