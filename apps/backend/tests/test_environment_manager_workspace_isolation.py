import pytest
from app.api.routes.environment_manager import services as env_svc
from app.api.routes.environment_manager.schema import EnvSetEntryCreate, EnvSetEntryUpdate
from app.api.routes.workspaces.middleware import WorkspaceContext


def _ctx(uid: str, ws_id: str) -> WorkspaceContext:
    return WorkspaceContext(
        uid=uid, workspace_id=ws_id, ws_role="admin",
        is_personal=True, owner_uid=uid,
    )


@pytest.mark.asyncio
async def test_env_entries_are_isolated_across_personal_workspaces(
    clean_db, personal_ws_for,
):
    ws_u1 = await personal_ws_for("u1")
    ws_u2 = await personal_ws_for("u2")

    ctx_u1 = _ctx("u1", ws_u1)
    ctx_u2 = _ctx("u2", ws_u2)

    await env_svc.create_entry(ctx_u1, EnvSetEntryCreate(encryptedData="enc-u1", iv="iv-u1"))

    entries_u1 = await env_svc.list_entries(ctx_u1)
    entries_u2 = await env_svc.list_entries(ctx_u2)

    assert len(entries_u1) == 1
    assert len(entries_u2) == 0


@pytest.mark.asyncio
async def test_forged_workspace_id_cannot_cross_env_data(
    clean_db, personal_ws_for,
):
    ws_u1 = await personal_ws_for("u1")
    await personal_ws_for("u2")

    ctx_u1 = _ctx("u1", ws_u1)
    await env_svc.create_entry(ctx_u1, EnvSetEntryCreate(encryptedData="enc-u1", iv="iv-u1"))

    forged_ctx = _ctx("u2", ws_u1)  # u2 forges u1's workspace_id
    entries = await env_svc.list_entries(forged_ctx)
    assert entries == []  # owner_uid filter saves us
