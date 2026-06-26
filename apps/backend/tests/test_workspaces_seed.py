import pytest
from app.api.routes.workspaces.seed import (
    SYSTEM_ORG_NAME,
    SYSTEM_ORG_SLUG,
    ensure_system_org,
    get_system_org_id,
)
from app.database import db_manager
from app.utils.collection_name import ORGANIZATIONS


@pytest.mark.asyncio
async def test_ensure_system_org_creates_singleton(clean_db):
    org_id_first = await ensure_system_org()
    org_id_second = await ensure_system_org()

    assert org_id_first == org_id_second

    docs = await db_manager.find(
        ORGANIZATIONS, {"slug": SYSTEM_ORG_SLUG}, limit=10
    )
    assert len(docs) == 1
    assert docs[0]["name"] == SYSTEM_ORG_NAME
    assert docs[0]["kind"] == "system"
    assert docs[0].get("owner_uid") is None


@pytest.mark.asyncio
async def test_get_system_org_id_returns_none_when_not_seeded(clean_db):
    assert await get_system_org_id() is None


@pytest.mark.asyncio
async def test_get_system_org_id_returns_id_after_seed(clean_db):
    seeded = await ensure_system_org()
    fetched = await get_system_org_id()
    assert fetched == seeded
