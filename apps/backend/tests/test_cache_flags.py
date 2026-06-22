import pytest
from app.core import config
from app.core.cache.flags import is_namespace_enabled


def _set(monkeypatch, enabled=True, namespaces=""):
    monkeypatch.setattr(config, "get_settings", lambda: type("S", (), {
        "CACHE_ENABLED": enabled,
        "CACHE_NAMESPACES": namespaces,
    })())
    # invalidate any LRU cache on flags
    from app.core.cache import flags as f
    f._parsed_namespaces.cache_clear()


def test_disabled_globally(monkeypatch):
    _set(monkeypatch, enabled=False, namespaces="bookmarks")
    assert is_namespace_enabled("bookmarks") is False


def test_empty_namespaces(monkeypatch):
    _set(monkeypatch, enabled=True, namespaces="")
    assert is_namespace_enabled("bookmarks") is False


def test_matching_namespace(monkeypatch):
    _set(monkeypatch, enabled=True, namespaces="bookmarks,notes")
    assert is_namespace_enabled("bookmarks") is True
    assert is_namespace_enabled("notes") is True
    assert is_namespace_enabled("tasks") is False


def test_whitespace_tolerant(monkeypatch):
    _set(monkeypatch, enabled=True, namespaces="bookmarks ,  notes")
    assert is_namespace_enabled("bookmarks") is True
    assert is_namespace_enabled("notes") is True
