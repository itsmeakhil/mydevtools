import pytest
from app.core import redis_client


@pytest.mark.asyncio
async def test_get_redis_returns_none_without_url(monkeypatch):
    monkeypatch.setattr("app.core.redis_client._client", None)
    monkeypatch.setattr("app.core.redis_client.get_settings", lambda: type("S", (), {"REDIS_URL": None})())
    assert redis_client.get_redis() is None


@pytest.mark.asyncio
async def test_open_redis_noop_without_url(monkeypatch):
    monkeypatch.setattr("app.core.redis_client.get_settings", lambda: type("S", (), {"REDIS_URL": None, "CACHE_OP_TIMEOUT_MS": 50})())
    await redis_client.open_redis()
    assert redis_client.get_redis() is None
