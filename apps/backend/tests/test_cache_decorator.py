import asyncio
import pytest

from app.core.cache.decorator import cached, bump_version
from app.core.cache import keys as keys_mod


class _FakeRedis:
    def __init__(self):
        self.store: dict[bytes, bytes] = {}
        self.versions: dict[bytes, int] = {}
        self.fail: bool = False
        self.calls: list[tuple[str, str]] = []

    async def get(self, k):
        self.calls.append(("get", k.decode() if isinstance(k, bytes) else k))
        if self.fail:
            raise ConnectionError("down")
        return self.store.get(k if isinstance(k, bytes) else k.encode())

    async def setex(self, k, ttl, v):
        self.calls.append(("setex", k.decode() if isinstance(k, bytes) else k))
        if self.fail:
            raise ConnectionError("down")
        self.store[k if isinstance(k, bytes) else k.encode()] = v

    async def incr(self, k):
        if self.fail:
            raise ConnectionError("down")
        key = k if isinstance(k, bytes) else k.encode()
        self.versions[key] = self.versions.get(key, 0) + 1
        return self.versions[key]

    async def delete(self, k):
        if self.fail:
            raise ConnectionError("down")
        self.store.pop(k if isinstance(k, bytes) else k.encode(), None)


@pytest.fixture
def fake_redis(monkeypatch):
    r = _FakeRedis()
    monkeypatch.setattr("app.core.cache.decorator.get_redis", lambda: r)
    # also make ver-key lookups return string bytes
    async def _get(k):
        v = r.versions.get(k if isinstance(k, bytes) else k.encode())
        return str(v).encode() if v is not None else None
    # override to support both reads and version reads
    orig = r.get
    async def patched_get(k):
        # version key path
        if (k if isinstance(k, str) else k.decode()).startswith("cache:ver:"):
            return await _get(k)
        return await orig(k)
    monkeypatch.setattr(r, "get", patched_get)
    return r


@pytest.fixture
def enable_ns(monkeypatch):
    monkeypatch.setattr("app.core.cache.decorator.is_namespace_enabled", lambda ns: True)
    monkeypatch.setattr("app.core.cache.decorator._secret", lambda: b"test-secret")


@pytest.mark.asyncio
async def test_decorator_miss_then_hit(fake_redis, enable_ns):
    calls = {"n": 0}

    @cached(ns="auth_user", ttl=60, scope="user")
    async def list_bookmarks(*, uid: str):
        calls["n"] += 1
        return [{"id": "a"}]

    r1 = await list_bookmarks(uid="u1")
    r2 = await list_bookmarks(uid="u1")
    assert r1 == r2 == [{"id": "a"}]
    assert calls["n"] == 1  # second call served from cache


@pytest.mark.asyncio
async def test_bump_version_invalidates(fake_redis, enable_ns):
    calls = {"n": 0}

    @cached(ns="auth_user", ttl=60, scope="user")
    async def list_bookmarks(*, uid: str):
        calls["n"] += 1
        return [{"id": "a"}]

    await list_bookmarks(uid="u1")
    await bump_version(ns="auth_user", uid="u1")
    await list_bookmarks(uid="u1")
    assert calls["n"] == 2


@pytest.mark.asyncio
async def test_fail_open(fake_redis, enable_ns):
    fake_redis.fail = True

    @cached(ns="auth_user", ttl=60, scope="user")
    async def list_bookmarks(*, uid: str):
        return [{"id": "from-mongo"}]

    out = await list_bookmarks(uid="u1")
    assert out == [{"id": "from-mongo"}]


@pytest.mark.asyncio
async def test_disabled_namespace_skips_redis(fake_redis, monkeypatch):
    monkeypatch.setattr("app.core.cache.decorator.is_namespace_enabled", lambda ns: False)
    monkeypatch.setattr("app.core.cache.decorator._secret", lambda: b"x")

    @cached(ns="auth_user", ttl=60, scope="user")
    async def list_bookmarks(*, uid: str):
        return [{"id": "a"}]

    fake_redis.calls.clear()
    await list_bookmarks(uid="u1")
    assert fake_redis.calls == []


@pytest.mark.asyncio
async def test_user_scope_requires_uid(fake_redis, enable_ns):
    @cached(ns="auth_user", ttl=60, scope="user")
    async def list_bookmarks(**kw):
        return []

    with pytest.raises(ValueError, match="uid"):
        await list_bookmarks(folder_id="x")


def test_public_api():
    from app.core.cache import cached, bump_version, cache_invalidate, get_or_set
    assert callable(cached)
    assert callable(bump_version)
    assert callable(cache_invalidate)
    assert callable(get_or_set)
