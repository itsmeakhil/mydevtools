from typing import Any

from fastapi import HTTPException, status
from pymongo.errors import PyMongoError
from pymongo import ReturnDocument

from app.utils.collection_name import CODE_SNIPPETS as SNIPPETS
from app.api.routes.code_snippets.schema import (
    CodeSnippetCreate,
    CodeSnippetOut,
    CodeSnippetUpdate,
)
from app.database import db_manager
from app.utils.utils import create_timestamp, is_duplicate_key_error, new_id


def _doc_to_out(doc: dict[str, Any]) -> CodeSnippetOut:
    sid = doc.get("_id")
    return CodeSnippetOut(
        id=str(sid) if sid is not None else "",
        title=str(doc.get("title", "")),
        language=str(doc.get("language", "auto")),
        code=str(doc.get("code", "")),
        tags=list(doc.get("tags") or []),
        pinned=bool(doc.get("pinned", False)),
        createdAt=int(doc.get("createdAt", 0)),
        updatedAt=int(doc.get("updatedAt", 0)),
    )


async def list_code_snippets(uid: str, *, skip: int = 0, limit: int | None = None) -> list[CodeSnippetOut]:
    docs = await db_manager.find(
        SNIPPETS,
        {"created_by": uid},
        sort=[("updatedAt", -1), ("createdAt", -1)],
        skip=skip,
        limit=limit or 0,
    )
    return [_doc_to_out(d) for d in docs]


async def create_code_snippet(uid: str, body: CodeSnippetCreate) -> CodeSnippetOut:
    sid = body.id or new_id()
    ts = create_timestamp()
    created = body.createdAt if body.createdAt is not None else ts
    updated = body.updatedAt if body.updatedAt is not None else ts
    doc: dict[str, Any] = {
        "_id": sid,
        "created_by": uid,
        "title": body.title,
        "language": body.language,
        "code": body.code,
        "tags": body.tags or [],
        "pinned": body.pinned or False,
        "createdAt": created,
        "updatedAt": updated,
    }
    try:
        await db_manager.insert_one(SNIPPETS, doc)
    except PyMongoError as exc:
        if is_duplicate_key_error(exc):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Snippet id already exists.",
            ) from exc
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create snippet.",
        ) from exc
    return _doc_to_out(doc)


async def update_code_snippet(uid: str, snippet_id: str, body: CodeSnippetUpdate) -> CodeSnippetOut:
    patch = body.model_dump(exclude_unset=True)
    if not patch:
        return await get_code_snippet(uid, snippet_id)
    patch["updatedAt"] = create_timestamp()
    try:
        result = await db_manager.find_one_and_update(
            SNIPPETS,
            {"_id": snippet_id, "created_by": uid},
            {"$set": patch},
            return_document=ReturnDocument.AFTER,
        )
    except PyMongoError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update snippet.",
        ) from exc
    if not result:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Snippet not found.")
    return _doc_to_out(result)


async def get_code_snippet(uid: str, snippet_id: str) -> CodeSnippetOut:
    doc = await db_manager.find_one(SNIPPETS, {"_id": snippet_id, "created_by": uid})
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Snippet not found.")
    return _doc_to_out(doc)


async def delete_code_snippet(uid: str, snippet_id: str) -> None:
    result = await db_manager.delete_one(SNIPPETS, {"_id": snippet_id, "created_by": uid})
    if result.deleted_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Snippet not found.")
