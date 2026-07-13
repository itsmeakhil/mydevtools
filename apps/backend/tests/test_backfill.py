import pytest
from app.api.routes.auth import users_repo
from app.api.routes.workspaces.backfill import run_user_backfill
from app.database import db_manager
from app.utils.collection_name import PASSWORD_ENTRIES, NOTES, USER_PREFERENCES


@pytest.mark.asyncio
async def test_backfill_stamps_legacy_rows(clean_db, seed_legacy_user_data):
    # seed_legacy_user_data inserts a few rows in PASSWORD_ENTRIES + NOTES
    # for created_by="u1" with no workspace_id
    ws_id = "ws-1"

    await run_user_backfill("u1", ws_id)

    for entry in await db_manager.find(PASSWORD_ENTRIES, {"created_by": "u1"}, limit=100):
        assert entry["workspace_id"] == ws_id

    for note in await db_manager.find(NOTES, {"created_by": "u1"}, limit=100):
        assert note["workspace_id"] == ws_id

    assert await users_repo.get_migrated_at("u1") is not None


@pytest.mark.asyncio
async def test_backfill_is_idempotent(clean_db, seed_legacy_user_data):
    ws_id = "ws-1"
    await run_user_backfill("u1", ws_id)
    migrated_first = await users_repo.get_migrated_at("u1")
    await run_user_backfill("u1", ws_id)
    migrated_second = await users_repo.get_migrated_at("u1")
    assert migrated_first == migrated_second


@pytest.mark.asyncio
async def test_backfill_rewrites_pinned_tools(clean_db):
    ws_id = "ws-1"
    await db_manager.insert_one(
        USER_PREFERENCES,
        {"_id": "u1", "uid": "u1", "toolFavorites": ["/app/passwords", "/app/notes"]},
    )

    await run_user_backfill("u1", ws_id)

    pref = await db_manager.find_one(USER_PREFERENCES, {"_id": "u1"})
    assert pref["pinnedToolsByWorkspace"] == {ws_id: ["/app/passwords", "/app/notes"]}
    assert "toolFavorites" not in pref
