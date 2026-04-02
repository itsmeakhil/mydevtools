from typing import Any

from bson import ObjectId
from bson.errors import InvalidId
from fastapi import HTTPException, status

try:
    from pymongo.collection import Collection
    from pymongo.errors import PyMongoError
except Exception:  # pragma: no cover
    Collection = Any  # type: ignore
    PyMongoError = Exception  # type: ignore

from app.core.db import get_db
from app.utils.collection_name import API_CLIENT_COLLECTIONS, API_CLIENT_ENVIRONMENTS
from app.api.routes.api_client.schema import (
    ApiClientCollectionCreate,
    ApiClientCollectionOut,
    ApiClientCollectionUpdate,
    ApiClientEnvironmentCreate,
    ApiClientEnvironmentOut,
    ApiClientEnvironmentUpdate,
)


def _collections_col() -> Collection:
    return get_db()[API_CLIENT_COLLECTIONS]


def _envs_col() -> Collection:
    return get_db()[API_CLIENT_ENVIRONMENTS]


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
    cursor = _collections_col().find({"created_by": uid}).sort("name", 1)
    return [_collection_to_out(d) for d in cursor]


def create_collection(uid: str, body: ApiClientCollectionCreate) -> ApiClientCollectionOut:
    doc: dict[str, Any] = {
        "created_by": uid,
        "name": body.name,
        "items": [],
    }
    try:
        result = _collections_col().insert_one(doc)
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
        doc = _collections_col().find_one({"_id": oid, "created_by": uid})
        if not doc:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Collection not found.")
        return _collection_to_out(doc)
    try:
        result = _collections_col().update_one({"_id": oid, "created_by": uid}, {"$set": patch})
    except PyMongoError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update collection.",
        ) from exc
    if result.matched_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Collection not found.")
    doc = _collections_col().find_one({"_id": oid})
    return _collection_to_out(doc)  # type: ignore[arg-type]


def delete_collection(uid: str, collection_id: str) -> None:
    oid = _parse_oid(collection_id, kind="collection")
    result = _collections_col().delete_one({"_id": oid, "created_by": uid})
    if result.deleted_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Collection not found.")


# Environments
def list_environments(uid: str) -> list[ApiClientEnvironmentOut]:
    cursor = _envs_col().find({"created_by": uid}).sort("name", 1)
    return [_env_to_out(d) for d in cursor]


def create_environment(uid: str, body: ApiClientEnvironmentCreate) -> ApiClientEnvironmentOut:
    doc: dict[str, Any] = {
        "created_by": uid,
        "name": body.name,
        "variables": [],
    }
    try:
        result = _envs_col().insert_one(doc)
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
        doc = _envs_col().find_one({"_id": oid, "created_by": uid})
        if not doc:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Environment not found.")
        return _env_to_out(doc)
    try:
        result = _envs_col().update_one({"_id": oid, "created_by": uid}, {"$set": patch})
    except PyMongoError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update environment.",
        ) from exc
    if result.matched_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Environment not found.")
    doc = _envs_col().find_one({"_id": oid})
    return _env_to_out(doc)  # type: ignore[arg-type]


def delete_environment(uid: str, environment_id: str) -> None:
    oid = _parse_oid(environment_id, kind="environment")
    result = _envs_col().delete_one({"_id": oid, "created_by": uid})
    if result.deleted_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Environment not found.")

