"""Integration tests for cache decorator against real Redis container."""
import asyncio

import pytest
from testcontainers.redis import RedisContainer

from app.core.cache import cached, bump_version


def _docker_available() -> bool:
    """Check if Docker is available by trying to connect to it."""
    try:
        import docker
        client = docker.from_env()
        client.ping()
        return True
    except Exception:  # noqa: BLE001
        return False


# Skip entire module if Docker is not available
pytestmark = pytest.mark.skipif(
    not _docker_available(),
    reason="docker not available"
)


@pytest.fixture(scope="module")
def redis_container():
    """Spin up a real Redis container for the test module."""
    with RedisContainer("redis:7-alpine") as c:
        yield c


@pytest.fixture
async def real_redis(redis_container, monkeypatch):
    """Set up real Redis connection via test container."""
    url = f"redis://{redis_container.get_container_host_ip()}:{redis_container.get_exposed_port(6379)}"
    monkeypatch.setenv("REDIS_URL", url)
    monkeypatch.setenv("CACHE_NAMESPACES", "bookmarks,notes,analytics_aggregate")

    # Reset Settings cache so it reads new env vars
    from app.core import config
    config.get_settings.cache_clear()

    # Reset flags cache
    from app.core.cache import flags
    flags._parsed_namespaces.cache_clear()

    # Open the real Redis connection
    from app.core.redis_client import open_redis, close_redis
    await open_redis()

    yield

    # Clean up
    await close_redis()


@pytest.mark.asyncio
async def test_real_decorator_hit(real_redis):
    """Test that decorator correctly caches and hits on second call."""
    calls = {"n": 0}

    @cached(ns="bookmarks", ttl=60, scope="user")
    async def list_bookmarks(*, uid: str):
        calls["n"] += 1
        return [{"id": "x"}]

    await list_bookmarks(uid="u1")
    await list_bookmarks(uid="u1")
    assert calls["n"] == 1, "Second call should be served from cache"


@pytest.mark.asyncio
async def test_real_bump_invalidates(real_redis):
    """Test that bump_version correctly invalidates cached entries."""
    calls = {"n": 0}

    @cached(ns="notes", ttl=60, scope="user")
    async def list_notes(*, uid: str):
        calls["n"] += 1
        return [{"id": "y"}]

    await list_notes(uid="u1")
    await bump_version(ns="notes", uid="u1")
    await list_notes(uid="u1")
    assert calls["n"] == 2, "After bump_version, cache should be invalidated"


@pytest.mark.asyncio
async def test_cross_user_isolation(real_redis):
    """Test that cache is properly isolated per user."""
    calls = {"n": 0}

    @cached(ns="bookmarks", ttl=60, scope="user")
    async def list_bookmarks(*, uid: str):
        calls["n"] += 1
        return [{"uid": uid}]

    await list_bookmarks(uid="u1")
    await bump_version(ns="bookmarks", uid="u1")  # only u1 invalidated
    await list_bookmarks(uid="u1")  # re-fetch u1 after bump (u1-after-bump)
    await list_bookmarks(uid="u2")
    await list_bookmarks(uid="u2")  # second u2 call must hit cache
    assert calls["n"] == 3, "u1, u1-after-bump, u2-first  (u2-second = cache hit)"
