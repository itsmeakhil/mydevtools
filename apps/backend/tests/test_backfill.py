import pytest
from app.api.routes.auth import users_repo
from app.api.routes.workspaces.backfill import BACKFILL_COLLECTIONS, run_user_backfill
from app.api.routes.workspaces.seed import ensure_system_org
from app.database import db_manager
from app.utils.collection_name import PASSWORD_ENTRIES, NOTES, USER_PREFERENCES


@pytest.mark.asyncio
async def test_backfill_stamps_legacy_rows(clean_db, seed_legacy_user_data):
    org_id = await ensure_system_org()
    # seed_legacy_user_data inserts a few rows in PASSWORD_ENTRIES + NOTES
    # for uid="u1" with no workspace_id
    ws_id = "ws-1"

    await run_user_backfill("u1", ws_id, org_id)

    for entry in await db_manager.find(PASSWORD_ENTRIES, {"created_by": "u1"}, limit=100):
        assert entry["org_id"] == org_id
        assert entry["workspace_id"] == ws_id

    for note in await db_manager.find(NOTES, {"uid": "u1"}, limit=100):
        assert note["org_id"] == org_id
        assert note["workspace_id"] == ws_id

    assert await users_repo.get_migrated_at("u1") is not None


@pytest.mark.asyncio
async def test_backfill_is_idempotent(clean_db, seed_legacy_user_data):
    org_id = await ensure_system_org()
    ws_id = "ws-1"
    await run_user_backfill("u1", ws_id, org_id)
    migrated_first = await users_repo.get_migrated_at("u1")
    await run_user_backfill("u1", ws_id, org_id)
    migrated_second = await users_repo.get_migrated_at("u1")
    assert migrated_first == migrated_second


@pytest.mark.asyncio
async def test_backfill_rewrites_pinned_tools(clean_db):
    org_id = await ensure_system_org()
    ws_id = "ws-1"
    await db_manager.insert_one(
        USER_PREFERENCES,
        {"_id": "u1", "uid": "u1", "pinned_tools": ["/app/passwords", "/app/notes"]},
    )

    await run_user_backfill("u1", ws_id, org_id)

    pref = await db_manager.find_one(USER_PREFERENCES, {"_id": "u1"})
    assert pref["pinned_tools_by_workspace"] == {ws_id: ["/app/passwords", "/app/notes"]}
    assert "pinned_tools" not in pref
