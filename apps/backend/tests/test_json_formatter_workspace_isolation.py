"""Workspace isolation tests for JSON formatter (JSON_FORMATTER_DOCUMENTS).

Tests ensure that:
1. Documents created by u1 are not visible to u2 across workspace boundaries.
2. Forged workspace_id cannot bypass owner_uid isolation.
"""
import pytest

from app.api.routes.json_formatter import services as jf_svc
from app.api.routes.json_formatter.schema import JsonFormatterDocumentCreate
from app.api.routes.workspaces.middleware import WorkspaceContext


def _ctx(uid: str, ws_id: str) -> WorkspaceContext:
    return WorkspaceContext(
        uid=uid,
        workspace_id=ws_id,
        ws_role="admin",
        is_personal=True,
        owner_uid=uid,
    )


@pytest.mark.asyncio
async def test_json_formatter_documents_isolated_across_personal_workspaces(
    clean_db, personal_ws_for,
):
    """Documents created by u1 must not appear in u2's list."""
    ws_u1 = await personal_ws_for("u1")
    ws_u2 = await personal_ws_for("u2")

    ctx_u1 = _ctx("u1", ws_u1)
    ctx_u2 = _ctx("u2", ws_u2)

    # u1 creates a document
    await jf_svc.create_document(ctx_u1, JsonFormatterDocumentCreate(title="test", pane="left", content="{}"))

    # u1 sees their document
    docs_u1 = await jf_svc.list_documents(ctx_u1)
    assert len(docs_u1) == 1
    assert docs_u1[0].title == "test"

    # u2 does not see u1's document
    docs_u2 = await jf_svc.list_documents(ctx_u2)
    assert len(docs_u2) == 0


@pytest.mark.asyncio
async def test_forged_workspace_cannot_read_json_formatter_documents(
    clean_db, personal_ws_for,
):
    """u2 forging u1's workspace_id still cannot see u1's documents due to owner_uid."""
    ws_u1 = await personal_ws_for("u1")
    await personal_ws_for("u2")

    ctx_u1 = _ctx("u1", ws_u1)
    await jf_svc.create_document(ctx_u1, JsonFormatterDocumentCreate(title="secret", pane="left", content="{}"))

    # u2 forges u1's workspace_id
    forged_ctx = _ctx("u2", ws_u1)
    docs = await jf_svc.list_documents(forged_ctx)
    assert docs == []  # owner_uid filter prevents cross-user bleed
