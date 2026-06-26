from fastapi import APIRouter, Depends, Query

from app.api.routes.code_snippets import services as snippet_svc
from app.api.routes.code_snippets.schema import CodeSnippetCreate, CodeSnippetOut, CodeSnippetUpdate
from app.api.routes.workspaces.middleware import WorkspaceContext, get_workspace_ctx

router = APIRouter(prefix="/code-snippets", tags=["code-snippets"])


@router.get("", response_model=list[CodeSnippetOut], summary="List code snippets for current user")
async def list_snippets(
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    skip: int = Query(default=0, ge=0),
    limit: int | None = Query(default=None, ge=1, le=500),
) -> list[CodeSnippetOut]:
    return await snippet_svc.list_code_snippets(ctx, skip=skip, limit=limit)


@router.post("", response_model=CodeSnippetOut, summary="Create a code snippet")
async def create_snippet(body: CodeSnippetCreate, ctx: WorkspaceContext = Depends(get_workspace_ctx)) -> CodeSnippetOut:
    return await snippet_svc.create_code_snippet(ctx, body)


@router.patch("/{snippet_id}", response_model=CodeSnippetOut, summary="Update a code snippet")
async def patch_snippet(
    snippet_id: str,
    body: CodeSnippetUpdate,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
) -> CodeSnippetOut:
    return await snippet_svc.update_code_snippet(ctx, snippet_id, body)


@router.delete("/{snippet_id}", status_code=204, summary="Delete a code snippet")
async def remove_snippet(snippet_id: str, ctx: WorkspaceContext = Depends(get_workspace_ctx)) -> None:
    await snippet_svc.delete_code_snippet(ctx, snippet_id)
