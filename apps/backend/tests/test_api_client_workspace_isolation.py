"""Workspace isolation tests for API Client collections, environments, history,
and internal workspaces. Mirrors the pattern used in test_nosql_workspace_isolation.py.

Covers the most user-visible data path: COLLECTIONS (T14 primary concern).
"""
import pytest

from app.api.routes.api_client import services as api_client_svc
from app.api.routes.api_client.schema import (
    ApiClientCollectionCreate,
    ApiClientEnvironmentCreate,
    ApiClientHistoryCreate,
    ApiClientWorkspaceCreate,
)
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
async def test_api_client_collections_isolated_across_personal_workspaces(
    clean_db, personal_ws_for,
):
    """Collections created by u1 must not appear in u2's list."""
    ws_u1 = await personal_ws_for("u1")
    ws_u2 = await personal_ws_for("u2")

    ctx_u1 = _ctx("u1", ws_u1)
    ctx_u2 = _ctx("u2", ws_u2)

    await api_client_svc.create_collection(ctx_u1, ApiClientCollectionCreate(name="u1-collection"))

    cols_u1 = await api_client_svc.list_collections(ctx=ctx_u1)
    cols_u2 = await api_client_svc.list_collections(ctx=ctx_u2)

    assert len(cols_u1) == 1
    assert len(cols_u2) == 0


@pytest.mark.asyncio
async def test_forged_workspace_cannot_read_api_client_collections(
    clean_db, personal_ws_for,
):
    """u2 forging u1's workspace_id still cannot see u1's collections due to owner_uid."""
    ws_u1 = await personal_ws_for("u1")
    await personal_ws_for("u2")

    ctx_u1 = _ctx("u1", ws_u1)
    await api_client_svc.create_collection(ctx_u1, ApiClientCollectionCreate(name="secret-collection"))

    forged_ctx = _ctx("u2", ws_u1)  # u2 claims u1's workspace_id
    cols = await api_client_svc.list_collections(ctx=forged_ctx)
    assert cols == []  # owner_uid filter prevents cross-user bleed


@pytest.mark.asyncio
async def test_api_client_environments_and_history_isolated(
    clean_db, personal_ws_for,
):
    """Environments and history created by u1 must not appear for u2."""
    ws_u1 = await personal_ws_for("u1")
    ws_u2 = await personal_ws_for("u2")

    ctx_u1 = _ctx("u1", ws_u1)
    ctx_u2 = _ctx("u2", ws_u2)

    await api_client_svc.create_environment(ctx_u1, ApiClientEnvironmentCreate(name="prod"))
    await api_client_svc.create_history(
        ctx_u1,
        ApiClientHistoryCreate(
            method="GET",
            url="https://example.com/api",
            name="example-request",
        ),
    )

    envs_u2 = await api_client_svc.list_environments(ctx=ctx_u2)
    history_u2 = await api_client_svc.list_history(ctx=ctx_u2)

    assert envs_u2 == []
    assert history_u2 == []
