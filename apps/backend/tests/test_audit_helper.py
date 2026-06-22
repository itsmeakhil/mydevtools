from app.utils.collection_name import AUDIT_LOG
from app.core import audit


def test_audit_log_collection_name():
    assert AUDIT_LOG == "audit_log"


def test_diff_passes_safe_fields_through():
    changes = audit.diff({"title": "Old"}, {"title": "New"})
    assert changes == [{"field": "title", "before": "Old", "after": "New"}]


def test_diff_redacts_sensitive_fields():
    changes = audit.diff(
        {"password": "old-secret"}, {"password": "new-secret"}
    )
    assert changes == [
        {"field": "password", "before": "[redacted]", "after": "[redacted]"}
    ]


def test_diff_redacts_unknown_fields_by_default():
    changes = audit.diff({"mystery": 1}, {"mystery": 2})
    assert changes == [
        {"field": "mystery", "before": "[redacted]", "after": "[redacted]"}
    ]


def test_diff_ignores_unchanged_fields():
    assert audit.diff({"title": "Same"}, {"title": "Same"}) == []


def test_diff_handles_create_and_delete():
    assert audit.diff(None, {"title": "New"}) == [
        {"field": "title", "before": None, "after": "New"}
    ]
    assert audit.diff({"title": "Gone"}, None) == [
        {"field": "title", "before": "Gone", "after": None}
    ]


def test_parse_user_agent_chrome_macos():
    d = audit.parse_user_agent(
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/120.0 Safari/537.36"
    )
    assert d["browser"] == "Chrome"
    assert d["os"] == "macOS"
    assert d["device_type"] == "desktop"


def test_parse_user_agent_fallback():
    d = audit.parse_user_agent(None)
    assert d == {"browser": "Unknown", "os": "Unknown", "device_type": "desktop"}


def test_context_mutation_round_trip():
    token = audit._audit_ctx.set(audit.AuditContext())
    try:
        audit.set_entity("bookmark", "abc")
        audit.set_action("bookmark.create")
        audit.add_change("title", None, "Hi")
        ctx = audit.current_context()
        assert ctx.entity_type == "bookmark"
        assert ctx.entity_id == "abc"
        assert ctx.action == "bookmark.create"
        assert ctx.changes == [{"field": "title", "before": None, "after": "Hi"}]
    finally:
        audit._audit_ctx.reset(token)
