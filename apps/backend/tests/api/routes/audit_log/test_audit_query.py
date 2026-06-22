import asyncio

import pytest

from app.api.routes.audit_log import services as svc


@pytest.fixture
def fake_db(monkeypatch):
    rows = [
        {"_id": "1", "uid": "u1", "action": "bookmark.create", "module": "bookmarks",
         "entity_type": "bookmark", "entity_id": "b1", "method": "POST",
         "path": "/api/v1/bookmarks", "status": 200, "outcome": "success",
         "changes": [{"field": "title", "before": None, "after": "GitHub"}],
         "summary": "Created bookmark 'GitHub'", "ip": "1.2.3.4", "ua_raw": "UA",
         "device": {"browser": "Chrome", "os": "macOS", "device_type": "desktop"},
         "latency_ms": 12, "ts": 1000, "expireAt": "x"},
    ]

    async def fake_find(collection_name, query, projection=None, sort=None, skip=0, limit=0, collation=None):
        assert query["uid"] == "u1"
        return rows

    async def fake_count(collection_name, query):
        return len(rows)

    monkeypatch.setattr("app.api.routes.audit_log.services.db_manager.find", fake_find)
    monkeypatch.setattr("app.api.routes.audit_log.services.db_manager.count_documents", fake_count)
    return rows


def test_list_audit_events_scopes_to_uid_and_excludes_expireAt(fake_db):
    out = asyncio.run(svc.list_audit_events("u1", skip=0, limit=50))
    assert out.total == 1
    assert out.items[0].action == "bookmark.create"
    assert not hasattr(out.items[0], "expireAt")
