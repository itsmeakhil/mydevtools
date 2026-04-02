import random
import string
import time
from datetime import datetime, timezone
from typing import Any, Optional

from fastapi import HTTPException, status

try:
    from pymongo.collection import Collection
    from pymongo.errors import PyMongoError
except Exception:  # pragma: no cover
    Collection = Any  # type: ignore
    PyMongoError = Exception  # type: ignore

from app.api.routes.auth.services import get_current_uid  # noqa: F401
from app.api.routes.nosql.schema import ConnectionCreate, ConnectionOut, ConnectionUpdate
from app.core.db import get_db
from app.utils.collection_name import NOSQL_CONNECTIONS


def now_ms() -> int:
    return int(time.time() * 1000)


def new_client_style_id() -> str:
    suffix = "".join(random.choices(string.ascii_lowercase + string.digits, k=9))
    return f"{now_ms()}-{suffix}"


def _connections_col() -> Collection:
    return get_db()[NOSQL_CONNECTIONS]


def _doc_to_out(doc: dict[str, Any], *, connection_id: str) -> ConnectionOut:
    created_at = int(doc.get("createdAt", 0)) or now_ms()
    last_used_at = int(doc.get("lastUsedAt", 0)) or created_at

    return ConnectionOut(
        id=connection_id,
        userId=str(doc.get("created_by", "")),
        connectionString=str(doc.get("connectionString", "")),
        name=str(doc.get("name", "")),
        createdAt=created_at,
        lastUsedAt=last_used_at,
    )


def list_connections(uid: str) -> list[ConnectionOut]:
    cursor = _connections_col().find({"created_by": uid}).sort([("lastUsedAt", -1), ("createdAt", -1)])
    out: list[ConnectionOut] = []
    for doc in cursor:
        cid = str(doc.get("_id", ""))
        out.append(_doc_to_out(doc, connection_id=cid))
    return out


def upsert_connection(uid: str, body: ConnectionCreate) -> ConnectionOut:
    ts = now_ms()

    existing = _connections_col().find_one({"created_by": uid, "connectionString": body.connectionString})
    if existing:
        patch: dict[str, Any] = {"lastUsedAt": ts}
        if body.name is not None:
            patch["name"] = body.name
        try:
            _connections_col().update_one({"_id": existing.get("_id"), "created_by": uid}, {"$set": patch})
        except PyMongoError as exc:
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to update connection.") from exc
        # Refresh doc for canonical values.
        existing = _connections_col().find_one({"_id": existing.get("_id"), "created_by": uid})
        if not existing:
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Connection missing after update.")
        return _doc_to_out(existing, connection_id=str(existing.get("_id", "")))

    new_id = new_client_style_id()
    doc: dict[str, Any] = {
        "_id": new_id,
        "created_by": uid,
        "connectionString": body.connectionString,
        "name": body.name or "My Connection",
        "createdAt": ts,
        "lastUsedAt": ts,
    }
    try:
        _connections_col().insert_one(doc)
    except PyMongoError as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to create connection.") from exc
    return _doc_to_out(doc, connection_id=new_id)


def update_connection(uid: str, connection_id: str, body: ConnectionUpdate) -> ConnectionOut:
    existing = _connections_col().find_one({"_id": connection_id, "created_by": uid})
    if not existing:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Connection not found.")

    ts = now_ms()
    patch: dict[str, Any] = {"lastUsedAt": ts}
    if body.connectionString is not None:
        patch["connectionString"] = body.connectionString
    if body.name is not None:
        patch["name"] = body.name

    try:
        _connections_col().update_one({"_id": connection_id, "created_by": uid}, {"$set": patch})
    except PyMongoError as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to update connection.") from exc

    updated = _connections_col().find_one({"_id": connection_id, "created_by": uid})
    if not updated:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Connection not found.")
    return _doc_to_out(updated, connection_id=connection_id)


def delete_connection(uid: str, connection_id: str) -> None:
    res = _connections_col().delete_one({"_id": connection_id, "created_by": uid})
    if res.deleted_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Connection not found.")

