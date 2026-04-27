import time
from typing import Any

from bson import ObjectId
from bson.errors import InvalidId
from fastapi import HTTPException, status

from pymongo.errors import PyMongoError

from app.utils.collection_name import (
    API_CLIENT_COLLECTIONS,
    API_CLIENT_ENVIRONMENTS,
    API_CLIENT_HISTORY,
)
from app.api.routes.api_client.schema import (
    ApiClientCollectionCreate,
    ApiClientCollectionOut,
    ApiClientCollectionUpdate,
    ApiClientEnvironmentCreate,
    ApiClientEnvironmentOut,
    ApiClientEnvironmentUpdate,
    ApiClientHistoryCreate,
    ApiClientHistoryOut,
    HISTORY_MAX_ITEMS,
)


from app.utils.utils import col


def _parse_oid(raw: str, *, kind: str) -> ObjectId:
    try:
        return ObjectId(raw)
    except InvalidId as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid {kind} id.",
        ) from exc


def _collection_to_out(doc: dict[str, Any]) -> ApiClientCollectionOut:
    oid = doc.get("_id")
    return ApiClientCollectionOut(
        id=str(oid) if oid is not None else "",
        name=doc.get("name", ""),
        items=list(doc.get("items") or []),
    )


def _env_to_out(doc: dict[str, Any]) -> ApiClientEnvironmentOut:
    oid = doc.get("_id")
    return ApiClientEnvironmentOut(
        id=str(oid) if oid is not None else "",
        name=doc.get("name", ""),
        variables=list(doc.get("variables") or []),
    )


# Collections
def list_collections(uid: str) -> list[ApiClientCollectionOut]:
    cursor = col(API_CLIENT_COLLECTIONS).find({"created_by": uid}).sort("name", 1)
    return [_collection_to_out(d) for d in cursor]


def create_collection(uid: str, body: ApiClientCollectionCreate) -> ApiClientCollectionOut:
    doc: dict[str, Any] = {
        "created_by": uid,
        "name": body.name,
        "items": [],
    }
    try:
        result = col(API_CLIENT_COLLECTIONS).insert_one(doc)
    except PyMongoError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create collection.",
        ) from exc
    doc["_id"] = result.inserted_id
    return _collection_to_out(doc)


def patch_collection(uid: str, collection_id: str, body: ApiClientCollectionUpdate) -> ApiClientCollectionOut:
    oid = _parse_oid(collection_id, kind="collection")
    patch = body.model_dump(exclude_unset=True)
    if not patch:
        doc = col(API_CLIENT_COLLECTIONS).find_one({"_id": oid, "created_by": uid})
        if not doc:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Collection not found.")
        return _collection_to_out(doc)
    try:
        result = col(API_CLIENT_COLLECTIONS).update_one({"_id": oid, "created_by": uid}, {"$set": patch})
    except PyMongoError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update collection.",
        ) from exc
    if result.matched_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Collection not found.")
    doc = col(API_CLIENT_COLLECTIONS).find_one({"_id": oid})
    return _collection_to_out(doc)  # type: ignore[arg-type]


def delete_collection(uid: str, collection_id: str) -> None:
    oid = _parse_oid(collection_id, kind="collection")
    result = col(API_CLIENT_COLLECTIONS).delete_one({"_id": oid, "created_by": uid})
    if result.deleted_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Collection not found.")


# Environments
def list_environments(uid: str) -> list[ApiClientEnvironmentOut]:
    cursor = col(API_CLIENT_ENVIRONMENTS).find({"created_by": uid}).sort("name", 1)
    return [_env_to_out(d) for d in cursor]


def create_environment(uid: str, body: ApiClientEnvironmentCreate) -> ApiClientEnvironmentOut:
    doc: dict[str, Any] = {
        "created_by": uid,
        "name": body.name,
        "variables": [],
    }
    try:
        result = col(API_CLIENT_ENVIRONMENTS).insert_one(doc)
    except PyMongoError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create environment.",
        ) from exc
    doc["_id"] = result.inserted_id
    return _env_to_out(doc)


def patch_environment(uid: str, environment_id: str, body: ApiClientEnvironmentUpdate) -> ApiClientEnvironmentOut:
    oid = _parse_oid(environment_id, kind="environment")
    patch = body.model_dump(exclude_unset=True)
    if not patch:
        doc = col(API_CLIENT_ENVIRONMENTS).find_one({"_id": oid, "created_by": uid})
        if not doc:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Environment not found.")
        return _env_to_out(doc)
    try:
        result = col(API_CLIENT_ENVIRONMENTS).update_one({"_id": oid, "created_by": uid}, {"$set": patch})
    except PyMongoError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update environment.",
        ) from exc
    if result.matched_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Environment not found.")
    doc = col(API_CLIENT_ENVIRONMENTS).find_one({"_id": oid})
    return _env_to_out(doc)  # type: ignore[arg-type]


def delete_environment(uid: str, environment_id: str) -> None:
    oid = _parse_oid(environment_id, kind="environment")
    result = col(API_CLIENT_ENVIRONMENTS).delete_one({"_id": oid, "created_by": uid})
    if result.deleted_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Environment not found.")


def _history_doc_to_out(doc: dict[str, Any]) -> ApiClientHistoryOut:
    oid = doc.get("_id")
    ts = doc.get("timestamp")
    if not isinstance(ts, int):
        ts = 0
    return ApiClientHistoryOut(
        id=str(oid) if oid is not None else "",
        method=str(doc.get("method", "GET")),
        url=str(doc.get("url", "")),
        params=list(doc.get("params") or []),
        headers=list(doc.get("headers") or []),
        body=dict(doc.get("body") or {}),
        auth=dict(doc.get("auth") or {}),
        name=str(doc.get("name", "")),
        timestamp=ts,
        status=doc.get("status") if isinstance(doc.get("status"), int) else None,
    )


def trim_history(uid: str) -> None:
    history_col = col(API_CLIENT_HISTORY)
    filt = {"created_by": uid}
    total = history_col.count_documents(filt)
    if total <= HISTORY_MAX_ITEMS:
        return
    excess = total - HISTORY_MAX_ITEMS
    oldest = list(history_col.find(filt, {"_id": 1}).sort("timestamp", 1).limit(excess))
    if not oldest:
        return
    ids = [d["_id"] for d in oldest]
    history_col.delete_many({"_id": {"$in": ids}, "created_by": uid})


def list_history(uid: str, *, limit: int = HISTORY_MAX_ITEMS) -> list[ApiClientHistoryOut]:
    lim = max(1, min(limit, HISTORY_MAX_ITEMS))
    cursor = col(API_CLIENT_HISTORY).find({"created_by": uid}).sort("timestamp", -1).limit(lim)
    return [_history_doc_to_out(d) for d in cursor]


def create_history(uid: str, body: ApiClientHistoryCreate) -> ApiClientHistoryOut:
    ts = body.timestamp if body.timestamp is not None else int(time.time() * 1000)
    doc: dict[str, Any] = {
        "created_by": uid,
        "method": body.method,
        "url": body.url,
        "params": body.params,
        "headers": body.headers,
        "body": body.body,
        "auth": body.auth,
        "name": body.name,
        "timestamp": ts,
        "status": body.status,
    }
    try:
        result = col(API_CLIENT_HISTORY).insert_one(doc)
    except PyMongoError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to save history entry.",
        ) from exc
    doc["_id"] = result.inserted_id
    return _history_doc_to_out(doc)


def delete_history_entry(uid: str, entry_id: str) -> None:
    oid = _parse_oid(entry_id, kind="history")
    result = col(API_CLIENT_HISTORY).delete_one({"_id": oid, "created_by": uid})
    if result.deleted_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="History entry not found.")


def clear_history(uid: str) -> None:
    try:
        col(API_CLIENT_HISTORY).delete_many({"created_by": uid})
    except PyMongoError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to clear history.",
        ) from exc

