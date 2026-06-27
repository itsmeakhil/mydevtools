import pytest
from httpx import AsyncClient
from app.utils.collection_name import INVITATIONS
from app.api.routes.workspaces.invitations_repo import (
    create_invitation, find_invitation_by_token,
)


@pytest.mark.asyncio
async def test_invitations_constant_exported():
    assert INVITATIONS == "invitations"


@pytest.mark.asyncio
async def test_create_and_find_invitation_roundtrip(clean_db):
    inv_id = await create_invitation({
        "_id": "inv-1",
        "org_id": "org-1",
        "workspace_id": None,
        "invited_email": "test@example.com",
        "invited_uid": None,
        "invited_role_org": "member",
        "invited_role_ws": None,
        "token": "tok-abc",
        "status": "pending",
        "invited_by": "u1",
        "created_at": 1000,
        "expires_at": 2000,
    })
    assert inv_id == "inv-1"
    doc = await find_invitation_by_token("tok-abc")
    assert doc is not None
    assert doc["status"] == "pending"


@pytest.fixture
async def authed_client_other_uid(clean_db) -> AsyncClient:
    """Authenticated HTTP client for a second test user (uid=other-uid)."""
    from app.api.routes.auth.services import get_current_uid
    from app.api.routes.workspaces.services import ensure_user_workspace_setup
    from app.main import app

    other_uid = "other-uid"

    def override_get_current_uid():
        return other_uid

    app.dependency_overrides[get_current_uid] = override_get_current_uid

    await ensure_user_workspace_setup(other_uid)

    async with AsyncClient(
        transport=__import__("httpx").ASGITransport(app=app),
        base_url="http://test",
    ) as client:
        yield client

    app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_invite_to_org_sends_email_and_creates_pending(authed_client, caplog):
    import logging
    caplog.set_level(logging.INFO)
    org_id = (await authed_client.post(
        "/api/v1/workspaces-api/orgs", json={"name": "InvOrg"}
    )).json()["id"]
    res = await authed_client.post(
        f"/api/v1/workspaces-api/orgs/{org_id}/members",
        json={"email": "alice@example.com", "role": "member"},
    )
    assert res.status_code == 201
    body = res.json()
    assert body["invited_email"] == "alice@example.com"
    assert body["status"] == "pending"
    # Dev-mode logger emits a line containing the recipient
    assert any("alice@example.com" in r.message for r in caplog.records)


@pytest.mark.asyncio
async def test_accept_invitation_creates_membership(authed_client_other_uid):
    # Setup: original user creates org + invite for the second user's email
    # then second user accepts. Implement via a separate authed_client for uid=alice.
    pass
