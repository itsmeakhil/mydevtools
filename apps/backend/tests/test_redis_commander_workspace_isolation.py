"""Workspace isolation tests for Redis Commander saved connections.
Mirrors the pattern used in test_s3_drive_workspace_isolation.py.
"""
import pytest

from app.api.routes.redis_commander import services as redis_svc
from app.api.routes.redis_commander.schema import RedisConnectionCreate
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
async def test_redis_connections_are_isolated_across_personal_workspaces(
    clean_db, personal_ws_for,
):
    """Connections created by u1 must not appear in u2's list."""
    ws_u1 = await personal_ws_for("u1")
    ws_u2 = await personal_ws_for("u2")

    ctx_u1 = _ctx("u1", ws_u1)
    ctx_u2 = _ctx("u2", ws_u2)

    await redis_svc.create_connection(
        ctx_u1, RedisConnectionCreate(encryptedData="encrypted-u1", iv="iv-u1", name="conn-u1")
    )

    connections_u1 = await redis_svc.list_connections(ctx_u1)
    connections_u2 = await redis_svc.list_connections(ctx_u2)

    assert len(connections_u1) == 1
    assert len(connections_u2) == 0


@pytest.mark.asyncio
async def test_forged_workspace_id_cannot_cross_redis_connections_data(
    clean_db, personal_ws_for,
):
    """u2 forging u1's workspace_id still cannot see u1's connections due to owner_uid."""
    ws_u1 = await personal_ws_for("u1")
    await personal_ws_for("u2")

    ctx_u1 = _ctx("u1", ws_u1)
    await redis_svc.create_connection(
        ctx_u1, RedisConnectionCreate(encryptedData="encrypted-u1", iv="iv-u1", name="conn-u1")
    )

    forged_ctx = _ctx("u2", ws_u1)  # u2 forges u1's workspace_id
    connections = await redis_svc.list_connections(forged_ctx)
    assert connections == []  # owner_uid filter saves us
