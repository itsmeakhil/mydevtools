from datetime import datetime, timezone
from typing import Any, Optional

from fastapi import HTTPException, status
from pymongo.errors import PyMongoError

from app.api.routes.notes.schema import NoteCreate, NoteOut, NoteUpdate
from app.utils.collection_name import NOTES
from app.utils.utils import new_id
from app.database import db_manager

def isoformat_utc(dt: datetime) -> str:
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc).isoformat()


def _doc_to_out(doc: dict[str, Any]) -> NoteOut:
    nid = str(doc.get("_id", ""))

    created_at_raw = doc.get("createdAt")
    updated_at_raw = doc.get("updatedAt")

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
        userId=str(doc.get("created_by", "")),
        createdAt=_to_iso(created_at_raw),
        updatedAt=_to_iso(updated_at_raw),
    )


def list_notes(uid: str) -> list[NoteOut]:
    cursor = db_manager.find(NOTES, {"created_by": uid}, sort=[("createdAt", 1)])
    return [_doc_to_out(d) for d in cursor]


def create_note(uid: str, body: NoteCreate) -> NoteOut:
    ts = datetime.now(timezone.utc)
    note_id = new_id()

    doc = {
        "_id": note_id,
        "created_by": uid,
        "title": body.title or "Untitled",
        "content": body.content if body.content is not None else {},
        "parentId": body.parentId,
        # Keep backend ASCII-only; UI falls back to an emoji if icon is missing.
        "icon": body.icon,
        "createdAt": ts,
        "updatedAt": ts,
    }

    try:
        db_manager.insert_one(NOTES, doc)
    except PyMongoError as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to create note.") from exc

    return _doc_to_out(doc)


def get_note(uid: str, note_id: str) -> NoteOut:
    doc = db_manager.find_one(NOTES, {"_id": note_id, "created_by": uid})
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Note not found.")
    return _doc_to_out(doc)


def update_note(uid: str, note_id: str, body: NoteUpdate) -> NoteOut:
    patch = body.model_dump(exclude_unset=True)
    if not patch:
        return get_note(uid, note_id)

    # Always bump updatedAt server-side.
    patch["updatedAt"] = datetime.now(timezone.utc)

    # Convert explicit nulls correctly: keep parentId as null if provided.
    try:
        result = db_manager.update_one(NOTES, {"_id": note_id, "created_by": uid}, {"$set": patch})
    except PyMongoError as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to update note.") from exc

    if result.matched_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Note not found.")

    doc = db_manager.find_one(NOTES, {"_id": note_id, "created_by": uid})
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Note not found.")
    return _doc_to_out(doc)


def _descendant_ids(uid: str, root_id: str) -> list[str]:
    # Simple in-memory tree expansion; keeps Mongo queries low for typical note counts.
    docs = list(db_manager.find(NOTES, {"created_by": uid}, {"_id": 1, "parentId": 1}))
    by_parent: dict[Optional[str], list[str]] = {}
    for d in docs:
        pid = d.get("parentId")
        by_parent.setdefault(pid, []).append(str(d.get("_id")))

    out: list[str] = []
    stack = [root_id]
    visited: set[str] = set()
    while stack:
        nid = stack.pop()
        if nid in visited:
            continue
        visited.add(nid)
        out.append(nid)
        for child in by_parent.get(nid, []):
            stack.append(child)
    return out


def delete_note(uid: str, note_id: str, *, recursive: bool = True) -> None:
    if recursive:
        ids = _descendant_ids(uid, note_id)
        result = db_manager.delete_many(NOTES, {"created_by": uid, "_id": {"$in": ids}})
        if result.deleted_count == 0:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Note not found.")
        return

    result = db_manager.delete_one(NOTES, {"created_by": uid, "_id": note_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Note not found.")


def delete_note_non_recursive(uid: str, note_id: str) -> None:
    delete_note(uid, note_id, recursive=False)

