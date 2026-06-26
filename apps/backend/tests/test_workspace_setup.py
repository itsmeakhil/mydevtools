import pytest
from app.api.routes.workspaces.repo import (
    find_org_membership,
    find_ws_membership,
    find_user_workspaces,
)
from app.api.routes.workspaces.seed import ensure_system_org
from app.api.routes.workspaces.services import ensure_user_workspace_setup


@pytest.mark.asyncio
async def test_first_call_creates_membership_and_personal_workspace(clean_db):
    org_id = await ensure_system_org()
    ws_id = await ensure_user_workspace_setup("u1")

    assert await find_org_membership(org_id, "u1") is not None
    assert await find_ws_membership(ws_id, "u1") is not None

    workspaces = await find_user_workspaces("u1")
    assert len(workspaces) == 1
    assert workspaces[0]["is_personal"] is True
    assert workspaces[0]["owner_uid"] == "u1"
    assert workspaces[0]["name"] == "Personal"


@pytest.mark.asyncio
async def test_second_call_is_no_op(clean_db, count_inserts):
    await ensure_system_org()
    await ensure_user_workspace_setup("u1")
    before = count_inserts()
    await ensure_user_workspace_setup("u1")
    after = count_inserts()
    assert after == before
