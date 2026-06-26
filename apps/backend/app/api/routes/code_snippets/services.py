from typing import Any

from fastapi import HTTPException, status

from app.api.routes.code_snippets.schema import (
    CodeSnippetCreate,
    CodeSnippetOut,
    CodeSnippetUpdate,
)
from app.api.routes.workspaces.middleware import (
    WorkspaceContext,
    apply_legacy_or_filter,
    apply_workspace_filter,
)
from app.database import db_manager
from app.utils.collection_name import CODE_SNIPPETS as SNIPPETS
from app.utils.crud import safe_delete_one, safe_insert, safe_update_one
from app.utils.utils import create_timestamp, new_id


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


# ponytail: cache removed during workspace refactor; re-add with (workspace_id, uid) key if hot
async def list_code_snippets(ctx: WorkspaceContext, *, skip: int = 0, limit: int | None = None) -> list[CodeSnippetOut]:
    flt = apply_legacy_or_filter(ctx, {}, user_field="created_by")
    docs = await db_manager.find(
        SNIPPETS,
        flt,
        sort=[("updatedAt", -1), ("createdAt", -1)],
        skip=skip,
        limit=limit or 0,
    )
    return [_doc_to_out(d) for d in docs]


async def create_code_snippet(ctx: WorkspaceContext, body: CodeSnippetCreate) -> CodeSnippetOut:
    sid = body.id or new_id()
    ts = create_timestamp()
    created = body.createdAt if body.createdAt is not None else ts
    updated = body.updatedAt if body.updatedAt is not None else ts
    doc: dict[str, Any] = {
        "_id": sid,
        "created_by": ctx.uid,
        "org_id": ctx.org_id,
        "workspace_id": ctx.workspace_id,
        "owner_uid": ctx.uid,
        "title": body.title,
        "language": body.language,
        "code": body.code,
        "tags": body.tags or [],
        "pinned": body.pinned or False,
        "createdAt": created,
        "updatedAt": updated,
    }
    await safe_insert(SNIPPETS, doc, name="Snippet")
    return _doc_to_out(doc)


async def update_code_snippet(ctx: WorkspaceContext, snippet_id: str, body: CodeSnippetUpdate) -> CodeSnippetOut:
    patch = body.model_dump(exclude_unset=True)
    if not patch:
        return await get_code_snippet(ctx=ctx, snippet_id=snippet_id)
    patch["updatedAt"] = create_timestamp()
    flt = apply_workspace_filter(ctx, {"_id": snippet_id, "created_by": ctx.uid})
    result = await safe_update_one(
        SNIPPETS,
        flt,
        patch,
        name="Snippet",
    )
    return _doc_to_out(result)


# ponytail: cache removed during workspace refactor; re-add with (workspace_id, uid) key if hot
async def get_code_snippet(*, ctx: WorkspaceContext, snippet_id: str) -> CodeSnippetOut:
    flt = apply_workspace_filter(ctx, {"_id": snippet_id, "created_by": ctx.uid})
    doc = await db_manager.find_one(SNIPPETS, flt)
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Snippet not found.")
    return _doc_to_out(doc)


async def delete_code_snippet(ctx: WorkspaceContext, snippet_id: str) -> None:
    flt = apply_workspace_filter(ctx, {"_id": snippet_id, "created_by": ctx.uid})
    await safe_delete_one(SNIPPETS, flt, name="Snippet")
