import pytest
from httpx import ASGITransport, AsyncClient


@pytest.mark.asyncio
async def test_app_boots_without_redis(monkeypatch):
    monkeypatch.delenv("REDIS_URL", raising=False)
    from app.main import app
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        r = await ac.get("/api/v1/health")
    assert r.status_code == 200
