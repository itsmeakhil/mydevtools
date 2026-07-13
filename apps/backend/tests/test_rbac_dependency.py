import pytest
from fastapi import HTTPException
from app.api.routes.workspaces.rbac import require_permission
from app.api.routes.workspaces.middleware import WorkspaceContext


def _ctx(role: str, is_personal: bool = False) -> WorkspaceContext:
    return WorkspaceContext(
        uid="u1", workspace_id="w1",
        ws_role=role, is_personal=is_personal,
        owner_uid="u1" if is_personal else None,
    )


@pytest.mark.asyncio
async def test_personal_workspace_bypasses_matrix():
    dep = require_permission("password-manager", "admin")
    ctx = _ctx("admin", is_personal=True)
    out = await dep(ctx=ctx)
    assert out is ctx


@pytest.mark.asyncio
async def test_viewer_blocked_from_writing_notes():
    dep = require_permission("notes", "write")
    with pytest.raises(HTTPException) as exc:
        await dep(ctx=_ctx("viewer"))
    assert exc.value.status_code == 403


@pytest.mark.asyncio
async def test_developer_allowed_to_delete_bookmarks():
    dep = require_permission("bookmarks", "delete")
    ctx = _ctx("developer")
    out = await dep(ctx=ctx)
    assert out is ctx


@pytest.mark.asyncio
async def test_encrypted_tool_blocked_for_shared_workspace():
    dep = require_permission("password-manager", "read")
    with pytest.raises(HTTPException) as exc:
        await dep(ctx=_ctx("admin"))
    assert exc.value.status_code == 403
