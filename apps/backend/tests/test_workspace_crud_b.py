import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_create_shared_workspace(authed_client: AsyncClient):
    org_create = await authed_client.post(
        "/api/v1/workspaces-api/orgs", json={"name": "Acme"}
    )
    org_id = org_create.json()["id"]
    res = await authed_client.post(
        f"/api/v1/workspaces-api/orgs/{org_id}/workspaces",
        json={"name": "Production"},
    )
    assert res.status_code == 201
    body = res.json()
    assert body["name"] == "Production"
    assert body["is_personal"] is False
    assert body["kind"] == "shared"
    assert body["ws_role"] == "admin"   # cascade from org owner


@pytest.mark.asyncio
async def test_personal_workspace_cannot_be_deleted(
    authed_client: AsyncClient, personal_ws_id: str,
):
    res = await authed_client.delete(f"/api/v1/workspaces-api/workspaces/{personal_ws_id}")
    assert res.status_code == 403


@pytest.mark.asyncio
async def test_delete_shared_workspace(authed_client: AsyncClient):
    org_create = await authed_client.post(
        "/api/v1/workspaces-api/orgs", json={"name": "DoomedOrg"}
    )
    org_id = org_create.json()["id"]
    ws_create = await authed_client.post(
        f"/api/v1/workspaces-api/orgs/{org_id}/workspaces",
        json={"name": "Doomed"},
    )
    ws_id = ws_create.json()["id"]
    res = await authed_client.delete(f"/api/v1/workspaces-api/workspaces/{ws_id}")
    assert res.status_code == 204
    listing = await authed_client.get("/api/v1/workspaces-api/workspaces")
    assert all(w["id"] != ws_id for w in listing.json())


@pytest.mark.asyncio
async def test_rename_workspace(authed_client: AsyncClient):
    org_create = await authed_client.post(
        "/api/v1/workspaces-api/orgs", json={"name": "RenameOrg"}
    )
    org_id = org_create.json()["id"]
    ws_create = await authed_client.post(
        f"/api/v1/workspaces-api/orgs/{org_id}/workspaces",
        json={"name": "First"},
    )
    ws_id = ws_create.json()["id"]
    res = await authed_client.patch(
        f"/api/v1/workspaces-api/workspaces/{ws_id}",
        json={"name": "Second"},
    )
    assert res.status_code == 200
    assert res.json()["name"] == "Second"
