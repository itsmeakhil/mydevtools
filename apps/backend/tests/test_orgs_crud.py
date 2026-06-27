import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_create_org_grants_owner_role(authed_client: AsyncClient):
    res = await authed_client.post(
        "/api/v1/workspaces-api/orgs",
        json={"name": "Acme Inc"},
    )
    assert res.status_code == 201
    body = res.json()
    assert body["name"] == "Acme Inc"
    assert body["slug"] == "acme-inc"
    assert body["kind"] == "user"
    assert body["org_role"] == "owner"


@pytest.mark.asyncio
async def test_rename_org_owner_only(authed_client: AsyncClient):
    create = await authed_client.post(
        "/api/v1/workspaces-api/orgs", json={"name": "Beta"}
    )
    org_id = create.json()["id"]
    res = await authed_client.patch(
        f"/api/v1/workspaces-api/orgs/{org_id}",
        json={"name": "Beta Renamed"},
    )
    assert res.status_code == 200
    assert res.json()["name"] == "Beta Renamed"


@pytest.mark.asyncio
async def test_delete_org_soft_deletes(authed_client: AsyncClient):
    create = await authed_client.post(
        "/api/v1/workspaces-api/orgs", json={"name": "Doomed"}
    )
    org_id = create.json()["id"]
    res = await authed_client.delete(f"/api/v1/workspaces-api/orgs/{org_id}")
    assert res.status_code == 204
    after = await authed_client.get("/api/v1/workspaces-api/orgs")
    assert all(o["id"] != org_id for o in after.json())


@pytest.mark.asyncio
async def test_cannot_delete_system_org(authed_client: AsyncClient, system_org_id: str):
    res = await authed_client.delete(f"/api/v1/workspaces-api/orgs/{system_org_id}")
    assert res.status_code == 403
