from typing import Any

from fastapi import HTTPException, status
from pymongo.errors import PyMongoError

from app.api.routes.sql_client.schema import (
    SqlConnectionCreate,
    SqlConnectionOut,
    SqlConnectionUpdate,
)
from app.utils.collection_name import SQL_CONNECTIONS
from app.utils.utils import now_ms, new_id, col



def _doc_to_out(doc: dict[str, Any], *, connection_id: str) -> SqlConnectionOut:
    created_at = int(doc.get("createdAt", 0)) or now_ms()
    last_used_at = int(doc.get("lastUsedAt", 0)) or created_at

    return SqlConnectionOut(
        id=connection_id,
        userId=str(doc.get("created_by", "")),
        encryptedData=str(doc.get("encryptedData", "")),
        iv=str(doc.get("iv", "")),
        name=str(doc.get("name", "")),
        type=doc.get("type", "postgresql"),
        createdAt=created_at,
        lastUsedAt=last_used_at,
    )


def list_connections(uid: str) -> list[SqlConnectionOut]:
    cursor = (
        col(SQL_CONNECTIONS)
        .find({"created_by": uid, "encryptedData": {"$exists": True}, "iv": {"$exists": True}})
        .sort([("lastUsedAt", -1), ("createdAt", -1)])
    )
    return [_doc_to_out(doc, connection_id=str(doc.get("_id", ""))) for doc in cursor]


def create_connection(uid: str, body: SqlConnectionCreate) -> SqlConnectionOut:
    ts = now_ms()
    _id = new_id()
    doc: dict[str, Any] = {
        "_id": _id,
        "created_by": uid,
        "encryptedData": body.encryptedData,
        "iv": body.iv,
        "name": body.name or "My Connection",
        "type": body.type,
        "createdAt": ts,
        "lastUsedAt": ts,
    }
    try:
        col(SQL_CONNECTIONS).insert_one(doc)
    except PyMongoError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create connection.",
        ) from exc
    return _doc_to_out(doc, connection_id=_id)


def update_connection(uid: str, connection_id: str, body: SqlConnectionUpdate) -> SqlConnectionOut:
    existing = col(SQL_CONNECTIONS).find_one({"_id": connection_id, "created_by": uid})
    if not existing:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Connection not found.")

    ts = now_ms()
    patch: dict[str, Any] = {"lastUsedAt": ts}

    if body.encryptedData is not None:
        patch["encryptedData"] = body.encryptedData
    if body.iv is not None:
        patch["iv"] = body.iv
    if body.name is not None:
        patch["name"] = body.name
    if body.type is not None:
        patch["type"] = body.type

    try:
        col(SQL_CONNECTIONS).update_one({"_id": connection_id, "created_by": uid}, {"$set": patch})
    except PyMongoError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update connection.",
        ) from exc

    updated = col(SQL_CONNECTIONS).find_one({"_id": connection_id, "created_by": uid})
    if not updated:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Connection not found.")
    return _doc_to_out(updated, connection_id=connection_id)


def delete_connection(uid: str, connection_id: str) -> None:
    res = col(SQL_CONNECTIONS).delete_one({"_id": connection_id, "created_by": uid})
    if res.deleted_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Connection not found.")


def touch_connection(uid: str, connection_id: str) -> None:
    """Update lastUsedAt without changing any other fields."""
    col(SQL_CONNECTIONS).update_one(
        {"_id": connection_id, "created_by": uid},
        {"$set": {"lastUsedAt": now_ms()}},
    )
