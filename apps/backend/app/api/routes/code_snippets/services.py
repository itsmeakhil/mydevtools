import random
import string
import time
from typing import Any

from fastapi import HTTPException, status
try:
    from pymongo.collection import Collection
    from pymongo.errors import PyMongoError
    from pymongo import ReturnDocument
except Exception:  # pragma: no cover
    Collection = Any  # type: ignore
    PyMongoError = Exception  # type: ignore

    class ReturnDocument:  # type: ignore
        AFTER = "after"

from app.api.routes.code_snippets.schema import (
    COLLECTION_CODE_SNIPPETS,
    CodeSnippetCreate,
    CodeSnippetOut,
    CodeSnippetUpdate,
)
from app.core.db import get_db


def now_ms() -> int:
    return int(time.time() * 1000)


def new_client_style_id() -> str:
    suffix = "".join(random.choices(string.ascii_lowercase + string.digits, k=9))
    return f"{now_ms()}-{suffix}"


def _col() -> Collection:
    return get_db()[COLLECTION_CODE_SNIPPETS]


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


def list_code_snippets(uid: str) -> list[CodeSnippetOut]:
    cursor = _col().find({"created_by": uid}).sort([("updatedAt", -1), ("createdAt", -1)])
    return [_doc_to_out(d) for d in cursor]


def create_code_snippet(uid: str, body: CodeSnippetCreate) -> CodeSnippetOut:
    sid = body.id or new_client_style_id()
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
        _col().insert_one(doc)
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
        result = _col().find_one_and_update(
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
    doc = _col().find_one({"_id": snippet_id, "created_by": uid})
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Snippet not found.")
    return _doc_to_out(doc)


def delete_code_snippet(uid: str, snippet_id: str) -> None:
    result = _col().delete_one({"_id": snippet_id, "created_by": uid})
    if result.deleted_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Snippet not found.")
