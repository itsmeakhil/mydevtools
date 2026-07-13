"""Workspace isolation tests for URL shortener (URL_LINKS and URL_CLICK_EVENTS).

Tests ensure that:
1. Links created by u1 are not visible to u2 across workspace boundaries.
2. Forged workspace_id cannot bypass owner_uid isolation.
3. Click events inherit the link owner's workspace stamps.
"""
import pytest

from app.api.routes.url_shortener import services as url_svc
from app.api.routes.url_shortener.schema import ShortLinkCreate
from app.api.routes.workspaces.middleware import WorkspaceContext


def _ctx(uid: str, ws_id: str) -> WorkspaceContext:
    return WorkspaceContext(
        uid=uid,
        workspace_id=ws_id,
        ws_role="admin",
        is_personal=True,
        owner_uid=uid,
    )


@pytest.mark.asyncio
async def test_url_shortener_links_isolated_across_personal_workspaces(
    clean_db, personal_ws_for,
):
    """Links created by u1 must not appear in u2's list."""
    ws_u1 = await personal_ws_for("u1")
    ws_u2 = await personal_ws_for("u2")

    ctx_u1 = _ctx("u1", ws_u1)
    ctx_u2 = _ctx("u2", ws_u2)

    # u1 creates a link
    await url_svc.create_link(ctx_u1, ShortLinkCreate(original_url="https://example.com"))

    # u1 sees their link
    links_u1 = await url_svc.list_my_short_urls(ctx=ctx_u1)
    assert len(links_u1) == 1
    assert links_u1[0].original_url == "https://example.com"

    # u2 does not see u1's link
    links_u2 = await url_svc.list_my_short_urls(ctx=ctx_u2)
    assert len(links_u2) == 0


@pytest.mark.asyncio
async def test_forged_workspace_cannot_read_url_shortener_links(
    clean_db, personal_ws_for,
):
    """u2 forging u1's workspace_id still cannot see u1's links due to owner_uid."""
    ws_u1 = await personal_ws_for("u1")
    await personal_ws_for("u2")

    ctx_u1 = _ctx("u1", ws_u1)
    await url_svc.create_link(ctx_u1, ShortLinkCreate(original_url="https://secret.com"))

    # u2 forges u1's workspace_id
    forged_ctx = _ctx("u2", ws_u1)
    links = await url_svc.list_my_short_urls(ctx=forged_ctx)
    assert links == []  # owner_uid filter prevents cross-user bleed


@pytest.mark.asyncio
async def test_click_events_inherit_link_workspace_stamps(
    clean_db, personal_ws_for,
):
    """Click events must inherit the link's workspace_id, owner_uid stamps."""
    ws_u1 = await personal_ws_for("u1")

    ctx_u1 = _ctx("u1", ws_u1)

    # u1 creates a link
    link = await url_svc.create_link(ctx_u1, ShortLinkCreate(original_url="https://example.com"))
    code = link.code

    # Record a click (without workspace context, as it's public)
    await url_svc.record_click(code, ua="Mozilla/5.0", referrer="https://google.com")

    # Query click events by code to verify stamps were inherited
    from app.database import db_manager
    from app.api.routes.url_shortener.schema import COLLECTION, CLICKS_COLLECTION

    # Verify the link has the correct stamps
    link_doc = await db_manager.find_one(COLLECTION, {"_id": code})
    assert link_doc is not None
    assert link_doc["workspace_id"] == ws_u1
    assert link_doc["owner_uid"] == "u1"

    # Verify clicks inherited the same stamps
    click_events = await db_manager.find(CLICKS_COLLECTION, {"code": code}, limit=10)
    assert len(click_events) > 0
    for event in click_events:
        assert event.get("workspace_id") == ws_u1
        assert event.get("owner_uid") == "u1"
