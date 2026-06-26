import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.core import audit
from app.core.audit_middleware import AuditMiddleware


@pytest.fixture
def captured(monkeypatch):
    docs = []

    async def fake_insert_one(collection_name, data):
        docs.append((collection_name, data))

    # Run the fire-and-forget task synchronously so assertions are deterministic.
    monkeypatch.setattr("app.core.audit_middleware.db_manager.insert_one", fake_insert_one)
    return docs


def build_app():
    app = FastAPI()
    app.add_middleware(AuditMiddleware)

    @app.post("/api/v1/bookmarks")
    async def create():
        audit.set_action("bookmark.create")
        audit.set_entity("bookmark", "bk1")
        audit.set_summary("Created bookmark 'GitHub'")
        audit.add_change("title", None, "GitHub")
        return {"id": "bk1"}

    @app.get("/api/v1/bookmarks")
    async def listing():
        return []

    @app.delete("/api/v1/bookmarks/{bid}")
    async def fail(bid: str):
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="nope")

    return app


def test_write_is_logged_with_envelope_and_detail(captured):
    client = TestClient(build_app())
    res = client.post(
        "/api/v1/bookmarks",
        headers={"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Chrome/120.0 Safari/537.36"},
    )
    assert res.status_code == 200
    assert len(captured) == 1
    _, doc = captured[0]
    assert doc["action"] == "bookmark.create"
    assert doc["module"] == "bookmarks"
    assert doc["entity_id"] == "bk1"
    assert doc["method"] == "POST"
    assert doc["outcome"] == "success"
    assert doc["device"]["browser"] == "Chrome"
    assert doc["changes"] == [{"field": "title", "before": None, "after": "GitHub"}]
    assert "expireAt" in doc and "ts" in doc


def test_get_is_not_logged(captured):
    client = TestClient(build_app())
    client.get("/api/v1/bookmarks")
    assert captured == []


def test_failed_write_logged_as_failure(captured):
    client = TestClient(build_app())
    res = client.delete("/api/v1/bookmarks/bk1")
    assert res.status_code == 404
    assert len(captured) == 1
    _, doc = captured[0]
    assert doc["outcome"] == "failure"
    assert doc["status"] == 404
    assert doc["module"] == "bookmarks"


def test_audit_write_failure_does_not_break_request(monkeypatch):
    async def boom(collection_name, data):
        raise RuntimeError("db down")

    monkeypatch.setattr("app.core.audit_middleware.db_manager.insert_one", boom)
    client = TestClient(build_app())
    res = client.post("/api/v1/bookmarks")
    assert res.status_code == 200  # user response unaffected


def test_bookmark_service_sets_audit_detail(monkeypatch):
    import asyncio as _asyncio
    from app.api.routes.bookmarks import services as bm
    from app.api.routes.bookmarks.schema import BookmarkCreate
    from app.api.routes.workspaces.middleware import WorkspaceContext
    from app.core import audit

    async def fake_insert_one(collection_name, data):
        return None

    monkeypatch.setattr("app.api.routes.bookmarks.services.db_manager.insert_one", fake_insert_one)

    _bm_ctx = WorkspaceContext(
        uid="uid1", org_id="org1", workspace_id="ws1", ws_role="admin",
        is_personal=True, owner_uid="uid1",
    )

    async def run():
        tok = audit._audit_ctx.set(audit.AuditContext())
        try:
            await bm.create_bookmark(_bm_ctx, BookmarkCreate(title="GitHub", url="https://gh.com"))
            ctx = audit.current_context()
            assert ctx.action == "bookmark.create"
            assert ctx.entity_type == "bookmark"
            assert ctx.entity_id  # the new id
            assert any(c["field"] == "title" and c["after"] == "GitHub" for c in (ctx.changes or []))
        finally:
            audit._audit_ctx.reset(tok)

    _asyncio.run(run())
