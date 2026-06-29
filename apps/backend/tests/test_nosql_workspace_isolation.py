import pytest
from app.api.routes.nosql import services as nosql_svc
from app.api.routes.nosql.schema import ConnectionCreate
from app.api.routes.workspaces.middleware import WorkspaceContext


def _ctx(uid: str, ws_id: str, org_id: str) -> WorkspaceContext:
    return WorkspaceContext(
        uid=uid, org_id=org_id, workspace_id=ws_id, ws_role="admin",
        is_personal=True, owner_uid=uid,
    )


@pytest.mark.asyncio
async def test_nosql_connections_are_isolated_across_personal_workspaces(
    clean_db, system_org_id, personal_ws_for,
):
    org_id = system_org_id
    ws_u1 = await personal_ws_for("u1")
    ws_u2 = await personal_ws_for("u2")

    ctx_u1 = _ctx("u1", ws_u1, org_id)
    ctx_u2 = _ctx("u2", ws_u2, org_id)

    await nosql_svc.create_connection(ctx_u1, ConnectionCreate(encryptedData="encrypted-u1", iv="iv-u1", name="conn-u1"))

    connections_u1 = await nosql_svc.list_connections(ctx_u1)
    connections_u2 = await nosql_svc.list_connections(ctx_u2)

    assert len(connections_u1) == 1
    assert len(connections_u2) == 0


@pytest.mark.asyncio
async def test_forged_workspace_id_cannot_cross_nosql_connections_data(
    clean_db, system_org_id, personal_ws_for,
):
    org_id = system_org_id
    ws_u1 = await personal_ws_for("u1")
    await personal_ws_for("u2")

    ctx_u1 = _ctx("u1", ws_u1, org_id)
    await nosql_svc.create_connection(ctx_u1, ConnectionCreate(encryptedData="encrypted-u1", iv="iv-u1", name="conn-u1"))

    forged_ctx = _ctx("u2", ws_u1, org_id)  # u2 forges u1's workspace_id
    connections = await nosql_svc.list_connections(forged_ctx)
    assert connections == []  # owner_uid filter saves us
