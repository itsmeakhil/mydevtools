"""Workspace isolation tests for SQL Client saved connections.
Mirrors the pattern used in test_nosql_workspace_isolation.py.
"""
import pytest

from app.api.routes.sql_client import services as sql_client_svc
from app.api.routes.sql_client.schema import SqlConnectionCreate
from app.api.routes.workspaces.middleware import WorkspaceContext


def _ctx(uid: str, ws_id: str, org_id: str) -> WorkspaceContext:
    return WorkspaceContext(
        uid=uid,
        org_id=org_id,
        workspace_id=ws_id,
        ws_role="admin",
        is_personal=True,
        owner_uid=uid,
    )


@pytest.mark.asyncio
async def test_sql_client_connections_are_isolated_across_personal_workspaces(
    clean_db, system_org_id, personal_ws_for,
):
    """Connections created by u1 must not appear in u2's list."""
    org_id = system_org_id
    ws_u1 = await personal_ws_for("u1")
    ws_u2 = await personal_ws_for("u2")

    ctx_u1 = _ctx("u1", ws_u1, org_id)
    ctx_u2 = _ctx("u2", ws_u2, org_id)

    await sql_client_svc.create_connection(
        ctx_u1, SqlConnectionCreate(encryptedData="encrypted-u1", iv="iv-u1", name="conn-u1", type="postgresql")
    )

    connections_u1 = await sql_client_svc.list_connections(ctx_u1)
    connections_u2 = await sql_client_svc.list_connections(ctx_u2)

    assert len(connections_u1) == 1
    assert len(connections_u2) == 0


@pytest.mark.asyncio
async def test_forged_workspace_id_cannot_cross_sql_client_connections_data(
    clean_db, system_org_id, personal_ws_for,
):
    """u2 forging u1's workspace_id still cannot see u1's connections due to owner_uid."""
    org_id = system_org_id
    ws_u1 = await personal_ws_for("u1")
    await personal_ws_for("u2")

    ctx_u1 = _ctx("u1", ws_u1, org_id)
    await sql_client_svc.create_connection(
        ctx_u1, SqlConnectionCreate(encryptedData="encrypted-u1", iv="iv-u1", name="conn-u1", type="postgresql")
    )

    forged_ctx = _ctx("u2", ws_u1, org_id)  # u2 forges u1's workspace_id
    connections = await sql_client_svc.list_connections(forged_ctx)
    assert connections == []  # owner_uid filter saves us
