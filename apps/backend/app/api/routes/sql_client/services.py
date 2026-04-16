import random
import string
import time
from typing import Any, Optional

from fastapi import HTTPException, status

try:
    from pymongo.collection import Collection
    from pymongo.errors import PyMongoError
except Exception:  # pragma: no cover
    Collection = Any  # type: ignore
    PyMongoError = Exception  # type: ignore

from app.api.routes.sql_client.schema import (
    SqlConnectionCreate,
    SqlConnectionOut,
    SqlConnectionUpdate,
)
from app.core.db import get_db
from app.utils.collection_name import SQL_CONNECTIONS


def now_ms() -> int:
    return int(time.time() * 1000)


def new_client_style_id() -> str:
    suffix = "".join(random.choices(string.ascii_lowercase + string.digits, k=9))
    return f"{now_ms()}-{suffix}"


def _col() -> Collection:
    return get_db()[SQL_CONNECTIONS]


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
        _col()
        .find({"created_by": uid, "encryptedData": {"$exists": True}, "iv": {"$exists": True}})
        .sort([("lastUsedAt", -1), ("createdAt", -1)])
    )
    return [_doc_to_out(doc, connection_id=str(doc.get("_id", ""))) for doc in cursor]


def create_connection(uid: str, body: SqlConnectionCreate) -> SqlConnectionOut:
    ts = now_ms()
    new_id = new_client_style_id()
    doc: dict[str, Any] = {
        "_id": new_id,
        "created_by": uid,
        "encryptedData": body.encryptedData,
        "iv": body.iv,
        "name": body.name or "My Connection",
        "type": body.type,
        "createdAt": ts,
        "lastUsedAt": ts,
    }
    try:
        _col().insert_one(doc)
    except PyMongoError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create connection.",
        ) from exc
    return _doc_to_out(doc, connection_id=new_id)


def update_connection(uid: str, connection_id: str, body: SqlConnectionUpdate) -> SqlConnectionOut:
    existing = _col().find_one({"_id": connection_id, "created_by": uid})
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
        _col().update_one({"_id": connection_id, "created_by": uid}, {"$set": patch})
    except PyMongoError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update connection.",
        ) from exc

    updated = _col().find_one({"_id": connection_id, "created_by": uid})
    if not updated:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Connection not found.")
    return _doc_to_out(updated, connection_id=connection_id)


def delete_connection(uid: str, connection_id: str) -> None:
    res = _col().delete_one({"_id": connection_id, "created_by": uid})
    if res.deleted_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Connection not found.")


def touch_connection(uid: str, connection_id: str) -> None:
    """Update lastUsedAt without changing any other fields."""
    _col().update_one(
        {"_id": connection_id, "created_by": uid},
        {"$set": {"lastUsedAt": now_ms()}},
    )
