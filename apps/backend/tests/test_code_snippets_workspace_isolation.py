import pytest
from app.api.routes.code_snippets import services as snippet_svc
from app.api.routes.code_snippets.schema import CodeSnippetCreate
from app.api.routes.workspaces.middleware import WorkspaceContext


def _ctx(uid: str, ws_id: str, org_id: str) -> WorkspaceContext:
    return WorkspaceContext(
        uid=uid, org_id=org_id, workspace_id=ws_id, ws_role="admin",
        is_personal=True, owner_uid=uid,
    )


@pytest.mark.asyncio
async def test_code_snippets_are_isolated_across_personal_workspaces(
    clean_db, system_org_id, personal_ws_for,
):
    org_id = system_org_id
    ws_u1 = await personal_ws_for("u1")
    ws_u2 = await personal_ws_for("u2")

    ctx_u1 = _ctx("u1", ws_u1, org_id)
    ctx_u2 = _ctx("u2", ws_u2, org_id)

    await snippet_svc.create_code_snippet(ctx_u1, CodeSnippetCreate(title="snippet-u1", code="code-u1"))

    snippets_u1 = await snippet_svc.list_code_snippets(ctx_u1)
    snippets_u2 = await snippet_svc.list_code_snippets(ctx_u2)

    assert len(snippets_u1) == 1
    assert len(snippets_u2) == 0


@pytest.mark.asyncio
async def test_forged_workspace_id_cannot_cross_code_snippets_data(
    clean_db, system_org_id, personal_ws_for,
):
    org_id = system_org_id
    ws_u1 = await personal_ws_for("u1")
    await personal_ws_for("u2")

    ctx_u1 = _ctx("u1", ws_u1, org_id)
    await snippet_svc.create_code_snippet(ctx_u1, CodeSnippetCreate(title="snippet-u1", code="code-u1"))

    forged_ctx = _ctx("u2", ws_u1, org_id)  # u2 forges u1's workspace_id
    snippets = await snippet_svc.list_code_snippets(forged_ctx)
    assert snippets == []  # owner_uid filter saves us
