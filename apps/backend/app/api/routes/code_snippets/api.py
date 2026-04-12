from fastapi import APIRouter, Depends

from app.api.routes.auth.services import get_current_uid
from app.api.routes.code_snippets.schema import CodeSnippetCreate, CodeSnippetOut, CodeSnippetUpdate
from app.api.routes.code_snippets import services as snippet_svc

router = APIRouter(prefix="/code-snippets", tags=["code-snippets"])


@router.get("", response_model=list[CodeSnippetOut], summary="List code snippets for current user")
def list_snippets(uid: str = Depends(get_current_uid)) -> list[CodeSnippetOut]:
    return snippet_svc.list_code_snippets(uid)


@router.post("", response_model=CodeSnippetOut, summary="Create a code snippet")
def create_snippet(body: CodeSnippetCreate, uid: str = Depends(get_current_uid)) -> CodeSnippetOut:
    return snippet_svc.create_code_snippet(uid, body)


@router.patch("/{snippet_id}", response_model=CodeSnippetOut, summary="Update a code snippet")
def patch_snippet(
    snippet_id: str,
    body: CodeSnippetUpdate,
    uid: str = Depends(get_current_uid),
) -> CodeSnippetOut:
    return snippet_svc.update_code_snippet(uid, snippet_id, body)


@router.delete("/{snippet_id}", status_code=204, summary="Delete a code snippet")
def remove_snippet(snippet_id: str, uid: str = Depends(get_current_uid)) -> None:
    snippet_svc.delete_code_snippet(uid, snippet_id)
