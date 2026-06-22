from datetime import datetime, timezone
from typing import Any, Optional

from fastapi import HTTPException, status
from pymongo.errors import PyMongoError

from app.api.routes.notes.schema import NoteCreate, NoteOut, NoteUpdate
from app.core.cache import cached, bump_version
from app.utils.collection_name import NOTES
from app.utils.utils import new_id
from app.database import db_manager


def isoformat_utc(dt: datetime) -> str:
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc).isoformat()


def _doc_to_out(doc: dict[str, Any]) -> NoteOut:
    nid = str(doc.get("_id", ""))

    def _to_iso(v: Any) -> str:
        if v is None:
            return isoformat_utc(datetime.now(timezone.utc))
        if isinstance(v, datetime):
            return isoformat_utc(v)
        if isinstance(v, str):
            return v
        return isoformat_utc(datetime.now(timezone.utc))

    return NoteOut(
        id=nid,
        title=str(doc.get("title", "")),
        content=doc.get("content", {}),
        parentId=doc.get("parentId"),
        icon=doc.get("icon"),
        pinned=bool(doc.get("pinned", False)),
        tags=list(doc.get("tags") or []),
        userId=str(doc.get("created_by", "")),
        createdAt=_to_iso(doc.get("createdAt")),
        updatedAt=_to_iso(doc.get("updatedAt")),
    )


_LIST_PROJECTION = {"content": 0}


@cached(ns="notes", ttl=120, scope="user")
async def list_notes(*, uid: str) -> list[NoteOut]:
    docs = await db_manager.find(
        NOTES,
        {"created_by": uid},
        projection=_LIST_PROJECTION,
        sort=[("createdAt", 1)],
    )
    return [_doc_to_out(d) for d in docs]


@cached(ns="notes", ttl=120, scope="user")
async def list_notes_paginated(*, uid: str, skip: int = 0, limit: int = 200) -> list[NoteOut]:
    docs = await db_manager.find(
        NOTES,
        {"created_by": uid},
        projection=_LIST_PROJECTION,
        sort=[("createdAt", 1)],
        skip=max(0, skip),
        limit=max(1, limit),
    )
    return [_doc_to_out(d) for d in docs]


async def create_note(uid: str, body: NoteCreate) -> NoteOut:
    ts = datetime.now(timezone.utc)
    note_id = new_id()
    doc = {
        "_id": note_id,
        "created_by": uid,
        "title": body.title or "Untitled",
        "content": body.content if body.content is not None else {},
        "parentId": body.parentId,
        "icon": body.icon,
        "pinned": body.pinned or False,
        "tags": body.tags or [],
        "createdAt": ts,
        "updatedAt": ts,
    }
    try:
        await db_manager.insert_one(NOTES, doc)
    except PyMongoError as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to create note.") from exc
    await bump_version(ns="notes", uid=uid)
    return _doc_to_out(doc)


@cached(ns="notes", ttl=120, scope="user")
async def get_note(*, uid: str, note_id: str) -> NoteOut:
    doc = await db_manager.find_one(NOTES, {"_id": note_id, "created_by": uid})
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Note not found.")
    return _doc_to_out(doc)


async def update_note(uid: str, note_id: str, body: NoteUpdate) -> NoteOut:
    patch = body.model_dump(exclude_unset=True)
    if not patch:
        return await get_note(uid=uid, note_id=note_id)

    patch["updatedAt"] = datetime.now(timezone.utc)
    try:
        result = await db_manager.update_one(NOTES, {"_id": note_id, "created_by": uid}, {"$set": patch})
    except PyMongoError as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to update note.") from exc

    if result.matched_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Note not found.")

    doc = await db_manager.find_one(NOTES, {"_id": note_id, "created_by": uid})
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Note not found.")
    await bump_version(ns="notes", uid=uid)
    return _doc_to_out(doc)


async def _descendant_ids(uid: str, root_id: str) -> list[str]:
    """BFS using targeted per-level queries instead of loading all user notes."""
    collected: list[str] = [root_id]
    frontier: list[str] = [root_id]
    visited: set[str] = {root_id}

    while frontier:
        docs = await db_manager.find(
            NOTES,
            {"created_by": uid, "parentId": {"$in": frontier}},
            projection={"_id": 1},
        )
        frontier = []
        for d in docs:
            nid = str(d.get("_id"))
            if nid not in visited:
                visited.add(nid)
                collected.append(nid)
                frontier.append(nid)

    return collected


async def delete_note(uid: str, note_id: str, *, recursive: bool = True) -> None:
    if recursive:
        ids = await _descendant_ids(uid, note_id)
        result = await db_manager.delete_many(NOTES, {"created_by": uid, "_id": {"$in": ids}})
        if result.deleted_count == 0:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Note not found.")
        await bump_version(ns="notes", uid=uid)
        return

    result = await db_manager.delete_one(NOTES, {"created_by": uid, "_id": note_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Note not found.")
    await bump_version(ns="notes", uid=uid)


async def delete_note_non_recursive(uid: str, note_id: str) -> None:
    await delete_note(uid, note_id, recursive=False)
