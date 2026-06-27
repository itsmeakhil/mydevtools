import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_list_orgs_returns_mydevtools_cloud(authed_client: AsyncClient):
    res = await authed_client.get("/api/v1/workspaces-api/orgs")
    assert res.status_code == 200
    orgs = res.json()
    assert len(orgs) == 1
    assert orgs[0]["slug"] == "mydevtools-cloud"
    assert orgs[0]["org_role"] == "member"


@pytest.mark.asyncio
async def test_list_workspaces_returns_personal(authed_client: AsyncClient):
    res = await authed_client.get("/api/v1/workspaces-api/workspaces")
    assert res.status_code == 200
    workspaces = res.json()
    assert len(workspaces) == 1
    assert workspaces[0]["is_personal"] is True
    assert workspaces[0]["name"] == "Personal"
    assert workspaces[0]["ws_role"] == "admin"


@pytest.mark.asyncio
async def test_set_active_workspace_validates_membership(authed_client: AsyncClient):
    res = await authed_client.post(
        "/api/v1/workspaces-api/workspaces/active",
        json={"workspace_id": "bogus-id"},
    )
    assert res.status_code == 403


@pytest.mark.asyncio
async def test_set_active_workspace_sets_cookie(authed_client: AsyncClient, personal_ws_id: str):
    res = await authed_client.post(
        "/api/v1/workspaces-api/workspaces/active",
        json={"workspace_id": personal_ws_id},
    )
    assert res.status_code == 200
    assert res.cookies.get("active_workspace") == personal_ws_id
