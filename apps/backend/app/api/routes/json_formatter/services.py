from datetime import datetime, timezone
from typing import Any

from bson import ObjectId
from bson.errors import InvalidId
from fastapi import HTTPException, status
from pymongo.errors import PyMongoError

from app.api.routes.json_formatter.schema import (
    JsonFormatterDocumentCreate,
    JsonFormatterDocumentOut,
    JsonFormatterDocumentUpdate,
)
from app.utils.collection_name import JSON_FORMATTER_DOCUMENTS as JSON
from app.database import db_manager


def _parse_oid(doc_id: str) -> ObjectId:
    try:
        return ObjectId(doc_id)
    except InvalidId as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid document id.",
        ) from exc


def _format_ts(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, datetime):
        if value.tzinfo is None:
            value = value.replace(tzinfo=timezone.utc)
        return value.astimezone(timezone.utc).isoformat()
    if isinstance(value, str):
        return value
    return str(value)


def _doc_to_out(doc: dict[str, Any]) -> JsonFormatterDocumentOut:
    oid = doc.get("_id")
    pane = doc.get("pane")
    if pane not in ("left", "right"):
        pane = "left"
    return JsonFormatterDocumentOut(
        id=str(oid) if oid is not None else "",
        title=doc.get("title", ""),
        pane=pane,
        content=doc.get("content") if isinstance(doc.get("content"), str) else "",
        createdAt=_format_ts(doc.get("createdAt")) or "",
        updatedAt=_format_ts(doc.get("updatedAt")) or "",
    )


async def list_documents(uid: str) -> list[JsonFormatterDocumentOut]:
    docs = await db_manager.find(JSON, {"created_by": uid}, sort=[("updatedAt", -1)])
    return [_doc_to_out(d) for d in docs]


async def list_documents_paginated(uid: str, *, skip: int = 0, limit: int = 200) -> list[JsonFormatterDocumentOut]:
    docs = await db_manager.find(
        JSON,
        {"created_by": uid},
        sort=[("updatedAt", -1)],
        skip=max(0, skip),
        limit=max(1, limit),
    )
    return [_doc_to_out(d) for d in docs]


async def create_document(uid: str, body: JsonFormatterDocumentCreate) -> JsonFormatterDocumentOut:
    now = datetime.now(timezone.utc)
    doc: dict[str, Any] = {
        "created_by": uid,
        "title": body.title,
        "pane": body.pane,
        "content": body.content,
        "createdAt": now,
        "updatedAt": now,
    }
    try:
        result = await db_manager.insert_one(JSON, doc)
    except PyMongoError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create JSON formatter document.",
        ) from exc
    doc["_id"] = result.inserted_id
    return _doc_to_out(doc)


async def get_document(uid: str, doc_id: str) -> JsonFormatterDocumentOut:
    oid = _parse_oid(doc_id)
    doc = await db_manager.find_one(JSON, {"_id": oid, "created_by": uid})
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found.")
    return _doc_to_out(doc)


async def update_document(uid: str, doc_id: str, body: JsonFormatterDocumentUpdate) -> JsonFormatterDocumentOut:
    oid = _parse_oid(doc_id)
    existing = await db_manager.find_one(JSON, {"_id": oid, "created_by": uid})
    if not existing:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found.")

    patch = body.model_dump(exclude_unset=True)
    if not patch:
        return _doc_to_out(existing)

    patch["updatedAt"] = datetime.now(timezone.utc)
    try:
        await db_manager.update_one(JSON, {"_id": oid, "created_by": uid}, {"$set": patch})
    except PyMongoError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to update document."
        ) from exc
    updated = await db_manager.find_one(JSON, {"_id": oid, "created_by": uid})
    return _doc_to_out(updated)  # type: ignore[arg-type]


async def delete_document(uid: str, doc_id: str) -> None:
    oid = _parse_oid(doc_id)
    result = await db_manager.delete_one(JSON, {"_id": oid, "created_by": uid})
    if result.deleted_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found.")
