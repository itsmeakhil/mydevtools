import pytest
from app.api.routes.api_key_vault import services as vault_svc
from app.api.routes.api_key_vault.schema import ApiKeyEntryCreate
from app.api.routes.workspaces.middleware import WorkspaceContext


def _ctx(uid: str, ws_id: str, org_id: str) -> WorkspaceContext:
    return WorkspaceContext(
        uid=uid, org_id=org_id, workspace_id=ws_id, ws_role="admin",
        is_personal=True, owner_uid=uid,
    )


@pytest.mark.asyncio
async def test_api_key_vault_entries_are_isolated_across_personal_workspaces(
    clean_db, system_org_id, personal_ws_for,
):
    org_id = system_org_id
    ws_u1 = await personal_ws_for("u1")
    ws_u2 = await personal_ws_for("u2")

    ctx_u1 = _ctx("u1", ws_u1, org_id)
    ctx_u2 = _ctx("u2", ws_u2, org_id)

    await vault_svc.create_entry(ctx_u1, ApiKeyEntryCreate(encryptedData="enc-u1", iv="iv-u1"))

    entries_u1 = await vault_svc.list_entries(ctx_u1)
    entries_u2 = await vault_svc.list_entries(ctx_u2)

    assert len(entries_u1) == 1
    assert len(entries_u2) == 0


@pytest.mark.asyncio
async def test_forged_workspace_id_cannot_cross_api_key_vault_data(
    clean_db, system_org_id, personal_ws_for,
):
    org_id = system_org_id
    ws_u1 = await personal_ws_for("u1")
    await personal_ws_for("u2")

    ctx_u1 = _ctx("u1", ws_u1, org_id)
    await vault_svc.create_entry(ctx_u1, ApiKeyEntryCreate(encryptedData="enc-u1", iv="iv-u1"))

    forged_ctx = _ctx("u2", ws_u1, org_id)  # u2 forges u1's workspace_id
    entries = await vault_svc.list_entries(forged_ctx)
    assert entries == []  # owner_uid filter saves us
