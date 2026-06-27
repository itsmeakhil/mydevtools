import pytest
from app.api.routes.workspaces.sweeper import (
    SOFT_DELETE_RETENTION_MS, run_sweeper_once,
)
from app.api.routes.workspaces.repo import upsert_org, set_org_deleted, find_org
from app.api.routes.workspaces.invitations_repo import create_invitation, find_invitation_by_token
from app.utils.utils import create_timestamp


@pytest.mark.asyncio
async def test_sweeper_hard_deletes_old_orgs(clean_db):
    org_id = await upsert_org("Old", "old", "user", "u1")
    old_ts = create_timestamp() - SOFT_DELETE_RETENTION_MS - 1000
    await set_org_deleted(org_id, old_ts)

    fresh_id = await upsert_org("Fresh", "fresh", "user", "u1")
    await set_org_deleted(fresh_id, create_timestamp())

    stats = await run_sweeper_once()
    assert stats["orgs_hard_deleted"] == 1
    assert await find_org(org_id) is None
    assert await find_org(fresh_id) is not None  # still in grace


@pytest.mark.asyncio
async def test_sweeper_expires_old_invitations(clean_db):
    old_ts = create_timestamp() - 1000
    await create_invitation({
        "_id": "inv-old", "org_id": "o1", "workspace_id": None,
        "invited_email": "x@y.com", "invited_uid": None,
        "invited_role_org": "member", "invited_role_ws": None,
        "token": "tok-old", "status": "pending",
        "invited_by": "u1",
        "created_at": old_ts - 10000, "expires_at": old_ts,
    })
    stats = await run_sweeper_once()
    assert stats["invitations_expired"] == 1
    doc = await find_invitation_by_token("tok-old")
    assert doc["status"] == "expired"
