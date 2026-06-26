import pytest
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
