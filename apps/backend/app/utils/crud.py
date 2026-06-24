"""Tiny CRUD helpers shared by route services.

Each service still owns its own `_doc_to_out` mapper and cache decorators; these
helpers only collapse the repeating try/except/HTTPException boilerplate around
insert/update/delete. Keeps services readable instead of forcing a generic
base class with many hooks.
"""
from typing import Any

from fastapi import HTTPException, status
from pymongo import ReturnDocument
from pymongo.errors import PyMongoError

from app.database import db_manager
from app.utils.utils import is_duplicate_key_error


async def safe_insert(collection: str, doc: dict[str, Any], *, name: str) -> None:
    """Insert; map duplicate-key → 409, other Mongo errors → 500."""
    try:
        await db_manager.insert_one(collection, doc)
    except PyMongoError as exc:
        if is_duplicate_key_error(exc):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"{name} id already exists.",
            ) from exc
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create {name.lower()}.",
        ) from exc


async def safe_update_one(
    collection: str,
    query: dict[str, Any],
    patch: dict[str, Any],
    *,
    name: str,
) -> dict[str, Any]:
    """Atomic find-and-set; map Mongo errors → 500, missing → 404."""
    try:
        doc = await db_manager.find_one_and_update(
            collection,
            query,
            {"$set": patch},
            return_document=ReturnDocument.AFTER,
        )
    except PyMongoError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update {name.lower()}.",
        ) from exc
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"{name} not found.",
        )
    return doc


async def safe_delete_one(
    collection: str,
    query: dict[str, Any],
    *,
    name: str,
) -> None:
    """Delete one; missing → 404."""
    result = await db_manager.delete_one(collection, query)
    if result.deleted_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"{name} not found.",
        )
