import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_list_org_members_after_create(authed_client: AsyncClient):
    org_id = (await authed_client.post(
        "/api/v1/workspaces-api/orgs", json={"name": "Acme"}
    )).json()["id"]
    res = await authed_client.get(f"/api/v1/workspaces-api/orgs/{org_id}/members")
    assert res.status_code == 200
    members = res.json()
    assert len(members) == 1
    assert members[0]["role"] == "owner"


@pytest.mark.asyncio
async def test_cannot_demote_sole_owner(authed_client: AsyncClient):
    org_id = (await authed_client.post(
        "/api/v1/workspaces-api/orgs", json={"name": "SoloOrg"}
    )).json()["id"]
    me_uid = "test-uid"  # the authed_client fixture's uid
    res = await authed_client.patch(
        f"/api/v1/workspaces-api/orgs/{org_id}/members/{me_uid}",
        json={"role": "member"},
    )
    assert res.status_code == 400
    assert "sole owner" in res.json()["detail"].lower()


@pytest.mark.asyncio
async def test_remove_org_member_cascades_to_workspaces(authed_client: AsyncClient):
    # Multi-member tests need a second test uid — set up via fixtures.
    # Verifies that removing a user from the org also drops their ws memberships.
    # (Skip skeleton — implement once test fixtures support multi-user clients.)
    pass
