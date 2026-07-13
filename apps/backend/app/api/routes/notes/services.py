from datetime import datetime, timezone
from typing import Any

from fastapi import HTTPException, status

from app.api.routes.notes.schema import NoteCreate, NoteOut, NoteUpdate
from app.api.routes.workspaces.middleware import (
    WorkspaceContext,
    apply_legacy_or_filter,
    apply_workspace_filter,
)
from app.database import db_manager
from app.utils.collection_name import NOTES
from app.utils.crud import safe_insert, safe_update_one
from app.utils.utils import new_id


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


# ponytail: cache removed during workspace refactor; re-add with (workspace_id, uid) key if hot
async def list_notes(*, ctx: WorkspaceContext) -> list[NoteOut]:
    flt = apply_legacy_or_filter(ctx, {}, user_field="created_by")
    docs = await db_manager.find(
        NOTES,
        flt,
        projection=_LIST_PROJECTION,
        sort=[("createdAt", 1)],
    )
    return [_doc_to_out(d) for d in docs]


# ponytail: cache removed during workspace refactor; re-add with (workspace_id, uid) key if hot
async def list_notes_paginated(*, ctx: WorkspaceContext, skip: int = 0, limit: int = 200) -> list[NoteOut]:
    flt = apply_legacy_or_filter(ctx, {}, user_field="created_by")
    docs = await db_manager.find(
        NOTES,
        flt,
        projection=_LIST_PROJECTION,
        sort=[("createdAt", 1)],
        skip=max(0, skip),
        limit=max(1, limit),
    )
    return [_doc_to_out(d) for d in docs]


async def create_note(ctx: WorkspaceContext, body: NoteCreate) -> NoteOut:
    ts = datetime.now(timezone.utc)
    note_id = new_id()
    doc = {
        "_id": note_id,
        "created_by": ctx.uid,
        "workspace_id": ctx.workspace_id,
        "owner_uid": ctx.uid,
        "title": body.title or "Untitled",
        "content": body.content if body.content is not None else {},
        "parentId": body.parentId,
        "icon": body.icon,
        "pinned": body.pinned or False,
        "tags": body.tags or [],
        "createdAt": ts,
        "updatedAt": ts,
    }
    await safe_insert(NOTES, doc, name="Note")
    return _doc_to_out(doc)


# ponytail: cache removed during workspace refactor; re-add with (workspace_id, uid) key if hot
async def get_note(*, ctx: WorkspaceContext, note_id: str) -> NoteOut:
    flt = apply_workspace_filter(ctx, {"_id": note_id, "created_by": ctx.uid})
    doc = await db_manager.find_one(NOTES, flt)
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Note not found.")
    return _doc_to_out(doc)


async def update_note(ctx: WorkspaceContext, note_id: str, body: NoteUpdate) -> NoteOut:
    patch = body.model_dump(exclude_unset=True)
    if not patch:
        return await get_note(ctx=ctx, note_id=note_id)

    patch["updatedAt"] = datetime.now(timezone.utc)
    flt = apply_workspace_filter(ctx, {"_id": note_id, "created_by": ctx.uid})
    doc = await safe_update_one(
        NOTES, flt, patch, name="Note"
    )
    return _doc_to_out(doc)


async def _descendant_ids(ctx: WorkspaceContext, root_id: str) -> list[str]:
    """BFS using targeted per-level queries instead of loading all user notes."""
    collected: list[str] = [root_id]
    frontier: list[str] = [root_id]
    visited: set[str] = {root_id}

    while frontier:
        base: dict[str, Any] = {"parentId": {"$in": frontier}}
        flt = apply_workspace_filter(ctx, {**base, "created_by": ctx.uid})
        docs = await db_manager.find(
            NOTES,
            flt,
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


async def delete_note(ctx: WorkspaceContext, note_id: str, *, recursive: bool = True) -> None:
    if recursive:
        ids = await _descendant_ids(ctx, note_id)
        flt = apply_workspace_filter(ctx, {"created_by": ctx.uid, "_id": {"$in": ids}})
        result = await db_manager.delete_many(NOTES, flt)
        if result.deleted_count == 0:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Note not found.")
        return

    flt = apply_workspace_filter(ctx, {"_id": note_id, "created_by": ctx.uid})
    result = await db_manager.delete_one(NOTES, flt)
    if result.deleted_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Note not found.")


async def delete_note_non_recursive(ctx: WorkspaceContext, note_id: str) -> None:
    await delete_note(ctx, note_id, recursive=False)
