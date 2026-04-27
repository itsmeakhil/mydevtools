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
from app.utils.utils import now_ms, new_id, col


def _doc_to_out(doc: dict[str, Any]) -> CodeSnippetOut:
    sid = doc.get("_id")
    return CodeSnippetOut(
        id=str(sid) if sid is not None else "",
        title=str(doc.get("title", "")),
        language=str(doc.get("language", "auto")),
        code=str(doc.get("code", "")),
        createdAt=int(doc.get("createdAt", 0)),
        updatedAt=int(doc.get("updatedAt", 0)),
    )


def list_code_snippets(uid: str, *, skip: int = 0, limit: int | None = None) -> list[CodeSnippetOut]:
    cursor = col(SNIPPETS).find({"created_by": uid}).sort([("updatedAt", -1), ("createdAt", -1)]).skip(skip)
    if limit is not None:
        cursor = cursor.limit(limit)
    return [_doc_to_out(d) for d in cursor]


def create_code_snippet(uid: str, body: CodeSnippetCreate) -> CodeSnippetOut:
    sid = body.id or new_id()
    ts = now_ms()
    created = body.createdAt if body.createdAt is not None else ts
    updated = body.updatedAt if body.updatedAt is not None else ts
    doc: dict[str, Any] = {
        "_id": sid,
        "created_by": uid,
        "title": body.title,
        "language": body.language,
        "code": body.code,
        "createdAt": created,
        "updatedAt": updated,
    }
    try:
        col(SNIPPETS).insert_one(doc)
    except PyMongoError as exc:
        if "duplicate" in str(exc).lower() or "E11000" in str(exc):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Snippet id already exists.",
            ) from exc
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create snippet.",
        ) from exc
    return _doc_to_out(doc)


def update_code_snippet(uid: str, snippet_id: str, body: CodeSnippetUpdate) -> CodeSnippetOut:
    patch = body.model_dump(exclude_unset=True)
    if not patch:
        return get_code_snippet(uid, snippet_id)
    patch["updatedAt"] = now_ms()
    try:
        result = col(SNIPPETS).find_one_and_update(
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


def get_code_snippet(uid: str, snippet_id: str) -> CodeSnippetOut:
    doc = col(SNIPPETS).find_one({"_id": snippet_id, "created_by": uid})
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Snippet not found.")
    return _doc_to_out(doc)


def delete_code_snippet(uid: str, snippet_id: str) -> None:
    result = col(SNIPPETS).delete_one({"_id": snippet_id, "created_by": uid})
    if result.deleted_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Snippet not found.")
