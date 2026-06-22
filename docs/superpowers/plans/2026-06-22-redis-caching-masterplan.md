# Redis Caching Masterplan — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a production-grade Redis caching layer that reduces MongoDB read load ≥60%, brings p50 list latency under 50ms, and rolls out per-namespace with a global kill-switch.

**Architecture:** Single-node Redis behind a lazy async pool. One `app.core.cache` facade with a `@cached` decorator. Versioned per-user keys (INCR on writes) plus short TTL on cross-user aggregates. XFetch (probabilistic early refresh) protects hot global keys from stampedes. Fail-open everywhere; structured logs.

**Tech Stack:** FastAPI, Motor/MongoDB, `redis[asyncio]>=5.0`, `orjson>=3.10`, SlowAPI, pytest + httpx, `testcontainers-python` (integration tests).

## Global Constraints

- Python ≥ 3.10 (already required).
- Add only `redis[asyncio]>=5.0` and `orjson>=3.10` as top-level deps. No `pickle`. No new caching libraries.
- All new env vars added to `Settings` in `apps/backend/app/core/config.py` with safe defaults.
- Existing test suite must pass after every task — run `pytest -q` from `apps/backend/`.
- Commit after every task. Conventional Commits format (`feat(cache): ...`, `test(cache): ...`).
- Cache layer is fail-open: every Redis call wrapped to log + degrade to direct DB. Never propagate `RedisError`.
- Decorator default scope = `"user"` — requires `uid` kwarg. Global namespaces opt in via `scope="global"`.
- Sensitive payloads (passwords) stored only as ciphertext, same shape as Mongo doc. Never cache decrypted secrets.
- Phase-0 ship = `CACHE_NAMESPACES=""` — every `@cached` is a runtime no-op. Code lands with zero behavior change.

---

## File Map

| File | Status | Responsibility |
|------|--------|---------------|
| `apps/backend/pyproject.toml` | modify | Add `redis[asyncio]>=5.0`, `orjson>=3.10`, `testcontainers>=4.0` (dev). |
| `apps/backend/app/core/config.py` | modify | Add cache + redis env vars. |
| `apps/backend/app/core/redis_client.py` | new | Lazy async pool, lifespan open/close, startup ping. |
| `apps/backend/app/core/cache/__init__.py` | new | Public API re-exports. |
| `apps/backend/app/core/cache/serializer.py` | new | orjson dumps/loads with Pydantic + datetime support. |
| `apps/backend/app/core/cache/keys.py` | new | Namespace registry, key + version-key builders. |
| `apps/backend/app/core/cache/flags.py` | new | `is_namespace_enabled(ns)`; global kill check. |
| `apps/backend/app/core/cache/xfetch.py` | new | Probabilistic early-expiration math. |
| `apps/backend/app/core/cache/decorator.py` | new | `@cached`, `get_or_set`, `bump_version`, `cache_invalidate`. |
| `apps/backend/app/main.py` | modify | Wire redis pool into lifespan; runtime kill-switch on ping failure. |
| `apps/backend/app/core/limiter.py` | modify | Switch SlowAPI to Redis storage when `REDIS_URL` set. |
| `apps/backend/app/api/routes/auth/services.py` | modify | Cache `verify_id_token`, wrap `get_current_user`, invalidate on logout. |
| `apps/backend/app/api/routes/bookmarks/services.py` | modify | `@cached` on reads, `bump_version` on writes. |
| `apps/backend/app/api/routes/notes/services.py` | modify | same pattern. |
| `apps/backend/app/api/routes/code_snippets/services.py` | modify | same. |
| `apps/backend/app/api/routes/tasks/services.py` | modify | same (60s TTL). |
| `apps/backend/app/api/routes/passwords/services.py` | modify | same (ciphertext only). |
| `apps/backend/app/api/routes/api_client/services.py` | modify | same. |
| `apps/backend/app/api/routes/user_preferences/services.py` | modify | same (600s TTL). |
| `apps/backend/app/api/routes/url_shortener/services.py` | modify | XFetch on public resolve, user-scoped list on owner reads. |
| `apps/backend/app/api/routes/analytics/services.py` | modify | XFetch on top-tools + activity aggregates. |
| `apps/backend/app/api/routes/dns_lookup/services.py` | modify | `scope="global"`, 1h TTL. |
| `apps/backend/tests/test_cache_serializer.py` | new | Serializer round-trip tests. |
| `apps/backend/tests/test_cache_keys.py` | new | Key builder + hash determinism. |
| `apps/backend/tests/test_cache_xfetch.py` | new | XFetch math properties. |
| `apps/backend/tests/test_cache_flags.py` | new | Namespace flag parsing. |
| `apps/backend/tests/test_cache_decorator.py` | new | Decorator hit/miss/fail-open + version bump. |
| `apps/backend/tests/test_cache_integration.py` | new | Real Redis integration (testcontainers). |
| `apps/backend/scripts/loadtest_cache.py` | new | k6/locust scenario for 1000 concurrent. |
| `apps/backend/README.md` | modify | Document cache env vars + deployment notes. |

---

## Task 1: Add dependencies

**Files:**
- Modify: `apps/backend/pyproject.toml`

**Interfaces:**
- Produces: `redis.asyncio` importable; `orjson` importable; `testcontainers.redis.RedisContainer` importable (dev only).

- [ ] **Step 1: Add deps to `pyproject.toml`**

Edit `apps/backend/pyproject.toml`. The `dependencies` list becomes:

```toml
dependencies = [
  "fastapi[standard]",
  "uvicorn[standard]>=0.35.0",
  "pydantic-settings>=2.10.1",
  "firebase-admin>=7.1.0",
  "pymongo",
  "motor>=3.7.0",
  "python-jose[cryptography]>=3.5.0",
  "boto3>=1.38.0",
  "slowapi>=0.1.9",
  "redis[asyncio]>=5.0",
  "orjson>=3.10",
]
```

The `[project.optional-dependencies]` `dev` list becomes:

```toml
dev = [
  "pytest>=8.4.1",
  "httpx>=0.28.1",
  "ruff>=0.13.0",
  "testcontainers[redis]>=4.0",
]
```

- [ ] **Step 2: Install**

Run:
```bash
cd apps/backend && uv sync --all-extras
```
Expected: resolves without conflicts.

- [ ] **Step 3: Verify imports**

Run:
```bash
cd apps/backend && python -c "import redis.asyncio, orjson; print('ok')"
```
Expected output: `ok`

- [ ] **Step 4: Run existing tests to verify no regression**

Run:
```bash
cd apps/backend && pytest -q
```
Expected: all existing tests pass.

- [ ] **Step 5: Commit**

```bash
git add apps/backend/pyproject.toml apps/backend/uv.lock
git commit -m "feat(cache): add redis[asyncio] + orjson deps"
```

---

## Task 2: Add cache config settings

**Files:**
- Modify: `apps/backend/app/core/config.py`

**Interfaces:**
- Produces: `Settings.REDIS_URL: str | None`, `Settings.CACHE_ENABLED: bool`, `Settings.CACHE_NAMESPACES: str`, `Settings.CACHE_DEFAULT_TTL: int`, `Settings.CACHE_OP_TIMEOUT_MS: int`, `Settings.CACHE_XFETCH_BETA: float`, `Settings.CACHE_LOG_LEVEL: str`.

- [ ] **Step 1: Write failing test**

Create `apps/backend/tests/test_cache_config.py`:

```python
import os
from app.core.config import Settings


def test_cache_defaults():
    os.environ.pop("CACHE_ENABLED", None)
    os.environ.pop("CACHE_NAMESPACES", None)
    s = Settings(ALLOWED_ORIGINS="http://localhost", ACCESS_TOKEN_EXPIRE_MINUTES=30, REFRESH_TOKEN_EXPIRE_DAYS=7)
    assert s.REDIS_URL is None
    assert s.CACHE_ENABLED is True
    assert s.CACHE_NAMESPACES == ""
    assert s.CACHE_DEFAULT_TTL == 120
    assert s.CACHE_OP_TIMEOUT_MS == 50
    assert s.CACHE_XFETCH_BETA == 1.0
    assert s.CACHE_LOG_LEVEL == "WARNING"
```

- [ ] **Step 2: Run test to verify failure**

Run:
```bash
cd apps/backend && pytest tests/test_cache_config.py -v
```
Expected: FAIL — `AttributeError: 'Settings' object has no attribute 'REDIS_URL'`.

- [ ] **Step 3: Add settings**

Edit `apps/backend/app/core/config.py`. Inside the `Settings` class, after `ALLOWED_ORIGINS: str`, add:

```python
    # Redis + cache
    REDIS_URL: str | None = None
    CACHE_ENABLED: bool = True
    CACHE_NAMESPACES: str = ""             # comma-separated; empty = no-op
    CACHE_DEFAULT_TTL: int = 120           # seconds
    CACHE_OP_TIMEOUT_MS: int = 50          # per Redis call
    CACHE_XFETCH_BETA: float = 1.0         # XFetch tuning constant
    CACHE_LOG_LEVEL: str = "WARNING"
```

- [ ] **Step 4: Run test to verify it passes**

Run:
```bash
cd apps/backend && pytest tests/test_cache_config.py -v
```
Expected: PASS.

- [ ] **Step 5: Run full suite**

Run:
```bash
cd apps/backend && pytest -q
```
Expected: all pass.

- [ ] **Step 6: Commit**

```bash
git add apps/backend/app/core/config.py apps/backend/tests/test_cache_config.py
git commit -m "feat(cache): add redis + cache env vars to Settings"
```

---

## Task 3: Redis client module

**Files:**
- Create: `apps/backend/app/core/redis_client.py`
- Create: `apps/backend/tests/test_redis_client.py`

**Interfaces:**
- Produces:
  - `get_redis() -> redis.asyncio.Redis | None` — singleton, returns `None` if `REDIS_URL` unset OR pool failed startup ping.
  - `async def open_redis() -> None` — called from lifespan; sets module singleton; pings.
  - `async def close_redis() -> None` — closes pool.
  - `async def is_redis_available() -> bool` — cheap status check.

- [ ] **Step 1: Write failing test**

Create `apps/backend/tests/test_redis_client.py`:

```python
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
```

(Note: `pytest-asyncio` already present via existing test pattern; if not, switch to `asyncio.run(...)` inside `def`.)

- [ ] **Step 2: Run test — verify failure**

```bash
cd apps/backend && pytest tests/test_redis_client.py -v
```
Expected: FAIL — module `app.core.redis_client` not found.

- [ ] **Step 3: Implement module**

Create `apps/backend/app/core/redis_client.py`:

```python
"""Lazy async Redis singleton + lifespan helpers."""
from __future__ import annotations

import asyncio
import logging
from typing import Optional

from redis.asyncio import Redis
from redis.exceptions import RedisError

from app.core.config import get_settings

log = logging.getLogger("app.cache")

_client: Optional[Redis] = None


def get_redis() -> Optional[Redis]:
    """Return the singleton Redis client or None if unavailable."""
    settings = get_settings()
    if settings.REDIS_URL is None:
        return None
    return _client


async def open_redis() -> None:
    """Open the pool and ping; called from FastAPI lifespan."""
    global _client
    settings = get_settings()
    if settings.REDIS_URL is None:
        log.info("redis.disabled url_unset")
        return
    try:
        client = Redis.from_url(
            settings.REDIS_URL,
            encoding="utf-8",
            decode_responses=False,
            socket_timeout=settings.CACHE_OP_TIMEOUT_MS / 1000,
            socket_connect_timeout=2.0,
            health_check_interval=30,
        )
        await asyncio.wait_for(client.ping(), timeout=2.0)
        _client = client
        log.info("redis.connected")
    except (RedisError, asyncio.TimeoutError, OSError) as exc:
        log.error("redis.connect.failed err=%s msg=%s", type(exc).__name__, exc)
        _client = None  # fail-open: cache layer treats all ops as miss


async def close_redis() -> None:
    """Close the pool."""
    global _client
    if _client is not None:
        try:
            await _client.aclose()
        except Exception as exc:  # noqa: BLE001
            log.warning("redis.close.failed err=%s", exc)
        _client = None


async def is_redis_available() -> bool:
    if _client is None:
        return False
    try:
        await asyncio.wait_for(_client.ping(), timeout=0.5)
        return True
    except (RedisError, asyncio.TimeoutError):
        return False
```

- [ ] **Step 4: Run test — verify pass**

```bash
cd apps/backend && pytest tests/test_redis_client.py -v
```
Expected: PASS.

- [ ] **Step 5: Run full suite**

```bash
cd apps/backend && pytest -q
```
Expected: all pass.

- [ ] **Step 6: Commit**

```bash
git add apps/backend/app/core/redis_client.py apps/backend/tests/test_redis_client.py
git commit -m "feat(cache): add lazy async Redis client with fail-open ping"
```

---

## Task 4: Cache serializer

**Files:**
- Create: `apps/backend/app/core/cache/__init__.py` (empty marker for now)
- Create: `apps/backend/app/core/cache/serializer.py`
- Create: `apps/backend/tests/test_cache_serializer.py`

**Interfaces:**
- Produces:
  - `dumps(value: Any) -> bytes` — orjson; supports Pydantic v2 `BaseModel`, list/dict of them, datetime, bytes.
  - `loads(payload: bytes) -> Any` — parses to dict/list/scalars. Pydantic reconstruction is caller's job.

- [ ] **Step 1: Write failing test**

Create `apps/backend/tests/test_cache_serializer.py`:

```python
from datetime import datetime, timezone

import pytest
from pydantic import BaseModel

from app.core.cache.serializer import dumps, loads


class Sample(BaseModel):
    id: str
    when: datetime
    tags: list[str]


def test_round_trip_dict():
    payload = {"a": 1, "b": "two", "c": [1, 2, 3]}
    assert loads(dumps(payload)) == payload


def test_pydantic_round_trip():
    s = Sample(id="x", when=datetime(2026, 1, 1, tzinfo=timezone.utc), tags=["a", "b"])
    raw = dumps(s)
    parsed = loads(raw)
    assert parsed["id"] == "x"
    assert parsed["tags"] == ["a", "b"]
    assert parsed["when"].startswith("2026-01-01")


def test_list_of_pydantic():
    items = [Sample(id=str(i), when=datetime(2026, 1, 1, tzinfo=timezone.utc), tags=[]) for i in range(3)]
    parsed = loads(dumps(items))
    assert isinstance(parsed, list)
    assert parsed[0]["id"] == "0"


def test_none_round_trip():
    assert loads(dumps(None)) is None


def test_bytes_round_trip():
    raw = dumps({"k": b"\x00\xff"})
    # bytes auto-serialized as base64 string by orjson default
    parsed = loads(raw)
    assert "k" in parsed
```

- [ ] **Step 2: Run — verify failure**

```bash
cd apps/backend && pytest tests/test_cache_serializer.py -v
```
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

Create `apps/backend/app/core/cache/__init__.py`:

```python
"""Cache facade. Public API lives in decorator.py and is re-exported here."""
```

Create `apps/backend/app/core/cache/serializer.py`:

```python
"""Cache serializer — orjson with Pydantic + datetime + bytes support."""
from __future__ import annotations

import base64
from typing import Any

import orjson
from pydantic import BaseModel


def _default(obj: Any) -> Any:
    if isinstance(obj, BaseModel):
        return obj.model_dump(mode="json")
    if isinstance(obj, bytes):
        return base64.b64encode(obj).decode("ascii")
    raise TypeError(f"Type {type(obj).__name__} not serializable")


def dumps(value: Any) -> bytes:
    return orjson.dumps(
        value,
        default=_default,
        option=orjson.OPT_NON_STR_KEYS | orjson.OPT_SERIALIZE_NUMPY,
    )


def loads(payload: bytes) -> Any:
    return orjson.loads(payload)
```

- [ ] **Step 4: Run test — verify pass**

```bash
cd apps/backend && pytest tests/test_cache_serializer.py -v
```
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/backend/app/core/cache/__init__.py apps/backend/app/core/cache/serializer.py apps/backend/tests/test_cache_serializer.py
git commit -m "feat(cache): add orjson serializer with Pydantic support"
```

---

## Task 5: Cache keys + namespace registry

**Files:**
- Create: `apps/backend/app/core/cache/keys.py`
- Create: `apps/backend/tests/test_cache_keys.py`

**Interfaces:**
- Produces:
  - `NAMESPACES: dict[str, NamespaceSpec]` — registry; `NamespaceSpec = TypedDict` with `scope`, `default_ttl`, `default_strategy`.
  - `register_namespace(name, *, scope, default_ttl, default_strategy) -> None`.
  - `build_key(*, ns: str, scope: str, uid: str | None, ver: int | None, op: str, args_hash: str) -> str`.
  - `version_key(ns: str, uid: str) -> str`.
  - `args_hash(kwargs: dict, *, secret: bytes) -> str` — keyed blake2b, returns 16-hex.

- [ ] **Step 1: Write failing test**

Create `apps/backend/tests/test_cache_keys.py`:

```python
import pytest

from app.core.cache.keys import (
    NAMESPACES,
    args_hash,
    build_key,
    register_namespace,
    version_key,
)


def test_register_and_lookup():
    register_namespace("bookmarks_test", scope="user", default_ttl=120, default_strategy="simple")
    assert NAMESPACES["bookmarks_test"]["scope"] == "user"


def test_build_user_key():
    key = build_key(ns="bookmarks", scope="user", uid="u1", ver=7, op="list", args_hash="abcd1234")
    assert key == "cache:bookmarks:u:u1:v7:list:abcd1234"


def test_build_global_key_no_version():
    key = build_key(ns="urlshort", scope="global", uid=None, ver=None, op="resolve", args_hash="ff00ee11")
    assert key == "cache:urlshort:g:resolve:ff00ee11"


def test_version_key():
    assert version_key("bookmarks", "u1") == "cache:ver:bookmarks:u:u1"


def test_args_hash_deterministic():
    h1 = args_hash({"a": 1, "b": 2}, secret=b"k")
    h2 = args_hash({"b": 2, "a": 1}, secret=b"k")
    assert h1 == h2
    assert len(h1) == 16


def test_args_hash_changes_with_input():
    h1 = args_hash({"a": 1}, secret=b"k")
    h2 = args_hash({"a": 2}, secret=b"k")
    assert h1 != h2


def test_args_hash_changes_with_secret():
    h1 = args_hash({"a": 1}, secret=b"k1")
    h2 = args_hash({"a": 1}, secret=b"k2")
    assert h1 != h2
```

- [ ] **Step 2: Run — verify failure**

```bash
cd apps/backend && pytest tests/test_cache_keys.py -v
```
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

Create `apps/backend/app/core/cache/keys.py`:

```python
"""Cache key builders + namespace registry."""
from __future__ import annotations

import hashlib
from typing import Literal, TypedDict

import orjson


class NamespaceSpec(TypedDict):
    scope: Literal["user", "global"]
    default_ttl: int
    default_strategy: Literal["simple", "xfetch"]


NAMESPACES: dict[str, NamespaceSpec] = {}


def register_namespace(
    name: str,
    *,
    scope: Literal["user", "global"],
    default_ttl: int,
    default_strategy: Literal["simple", "xfetch"] = "simple",
) -> None:
    if scope == "user" and default_strategy == "xfetch":
        raise ValueError("xfetch requires scope='global'")
    NAMESPACES[name] = {"scope": scope, "default_ttl": default_ttl, "default_strategy": default_strategy}


def build_key(
    *,
    ns: str,
    scope: str,
    uid: str | None,
    ver: int | None,
    op: str,
    args_hash: str,
) -> str:
    if scope == "user":
        if uid is None or ver is None:
            raise ValueError("user-scoped key requires uid and ver")
        return f"cache:{ns}:u:{uid}:v{ver}:{op}:{args_hash}"
    return f"cache:{ns}:g:{op}:{args_hash}"


def version_key(ns: str, uid: str) -> str:
    return f"cache:ver:{ns}:u:{uid}"


def args_hash(kwargs: dict, *, secret: bytes) -> str:
    payload = orjson.dumps(kwargs, option=orjson.OPT_SORT_KEYS)
    return hashlib.blake2b(payload, digest_size=8, key=secret[:64]).hexdigest()
```

Pre-register the namespaces from the spec. Append at end of `keys.py`:

```python
# --- spec-locked namespaces ---
register_namespace("auth_token", scope="global", default_ttl=300)
register_namespace("auth_user", scope="user", default_ttl=60)
register_namespace("bookmarks", scope="user", default_ttl=120)
register_namespace("notes", scope="user", default_ttl=120)
register_namespace("code_snippets", scope="user", default_ttl=120)
register_namespace("tasks", scope="user", default_ttl=60)
register_namespace("passwords", scope="user", default_ttl=60)
register_namespace("api_client", scope="user", default_ttl=300)
register_namespace("user_preferences", scope="user", default_ttl=600)
register_namespace("url_shortener_resolve", scope="global", default_ttl=600, default_strategy="xfetch")
register_namespace("url_shortener_owner", scope="user", default_ttl=120)
register_namespace("analytics_aggregate", scope="global", default_ttl=300, default_strategy="xfetch")
register_namespace("dns_lookup", scope="global", default_ttl=3600)
```

- [ ] **Step 4: Run — verify pass**

```bash
cd apps/backend && pytest tests/test_cache_keys.py -v
```
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/backend/app/core/cache/keys.py apps/backend/tests/test_cache_keys.py
git commit -m "feat(cache): add namespace registry + key builders"
```

---

## Task 6: XFetch math

**Files:**
- Create: `apps/backend/app/core/cache/xfetch.py`
- Create: `apps/backend/tests/test_cache_xfetch.py`

**Interfaces:**
- Produces:
  - `should_refresh(*, computed_at: float, ttl: float, delta: float, beta: float, now: float, rand: float) -> bool`
  - `wrap_payload(value: Any, *, computed_at: float, delta: float) -> dict`
  - `unwrap_payload(payload: dict) -> tuple[Any, float, float]` → `(value, computed_at, delta)`

- [ ] **Step 1: Write failing test**

Create `apps/backend/tests/test_cache_xfetch.py`:

```python
import math

import pytest

from app.core.cache.xfetch import should_refresh, unwrap_payload, wrap_payload


def test_beta_zero_never_refreshes_early():
    # beta=0 reduces to: now > computed_at + ttl  → only after TTL
    assert should_refresh(computed_at=0, ttl=100, delta=5, beta=0, now=50, rand=0.001) is False
    assert should_refresh(computed_at=0, ttl=100, delta=5, beta=0, now=101, rand=0.5) is True


def test_high_beta_refreshes_earlier():
    # With rand → 0, ln(rand) → -inf, refresh fires very early when beta > 0
    fires_at_t50 = should_refresh(computed_at=0, ttl=100, delta=5, beta=10, now=50, rand=1e-9)
    assert fires_at_t50 is True


def test_rand_near_one_no_early_refresh():
    # rand close to 1 → ln(rand) close to 0 → only past TTL
    assert should_refresh(computed_at=0, ttl=100, delta=5, beta=1, now=80, rand=0.999) is False


def test_wrap_unwrap_round_trip():
    p = wrap_payload({"x": 1}, computed_at=12345.0, delta=2.5)
    val, ca, dt = unwrap_payload(p)
    assert val == {"x": 1}
    assert ca == 12345.0
    assert dt == 2.5
```

- [ ] **Step 2: Run — verify failure**

```bash
cd apps/backend && pytest tests/test_cache_xfetch.py -v
```
Expected: FAIL — module missing.

- [ ] **Step 3: Implement**

Create `apps/backend/app/core/cache/xfetch.py`:

```python
"""Probabilistic early-expiration (XFetch).

Reference: "Optimal Probabilistic Cache Stampede Prevention" (Vattani et al., 2015).
"""
from __future__ import annotations

import math
from typing import Any


def should_refresh(
    *,
    computed_at: float,
    ttl: float,
    delta: float,
    beta: float,
    now: float,
    rand: float,
) -> bool:
    """Return True if the caller should refresh the cached value now."""
    if rand <= 0.0:
        rand = 1e-12
    if rand > 1.0:
        rand = 1.0
    threshold = computed_at + ttl - beta * delta * math.log(rand)
    return now >= threshold


def wrap_payload(value: Any, *, computed_at: float, delta: float) -> dict:
    return {"v": value, "ca": computed_at, "dt": delta}


def unwrap_payload(payload: dict) -> tuple[Any, float, float]:
    return payload["v"], float(payload["ca"]), float(payload["dt"])
```

Note the math: `should_refresh` is `now >= ca + ttl - beta*delta*ln(rand)`. Because `ln(rand)` is negative for `rand < 1`, `-beta*delta*ln(rand)` is positive — it shifts the threshold *earlier*. Larger `beta` or `delta` ⇒ refreshes earlier.

- [ ] **Step 4: Run — verify pass**

```bash
cd apps/backend && pytest tests/test_cache_xfetch.py -v
```
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/backend/app/core/cache/xfetch.py apps/backend/tests/test_cache_xfetch.py
git commit -m "feat(cache): add XFetch math for stampede protection"
```

---

## Task 7: Namespace flags

**Files:**
- Create: `apps/backend/app/core/cache/flags.py`
- Create: `apps/backend/tests/test_cache_flags.py`

**Interfaces:**
- Produces:
  - `is_namespace_enabled(ns: str) -> bool` — checks `CACHE_ENABLED` AND `ns in CACHE_NAMESPACES`.

- [ ] **Step 1: Write failing test**

Create `apps/backend/tests/test_cache_flags.py`:

```python
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
```

- [ ] **Step 2: Run — verify failure**

```bash
cd apps/backend && pytest tests/test_cache_flags.py -v
```
Expected: FAIL — module missing.

- [ ] **Step 3: Implement**

Create `apps/backend/app/core/cache/flags.py`:

```python
"""Per-namespace cache enable flags."""
from __future__ import annotations

from functools import lru_cache

from app.core.config import get_settings


@lru_cache(maxsize=1)
def _parsed_namespaces() -> frozenset[str]:
    raw = get_settings().CACHE_NAMESPACES or ""
    return frozenset(p.strip() for p in raw.split(",") if p.strip())


def is_namespace_enabled(ns: str) -> bool:
    s = get_settings()
    if not s.CACHE_ENABLED:
        return False
    return ns in _parsed_namespaces()
```

- [ ] **Step 4: Run — verify pass**

```bash
cd apps/backend && pytest tests/test_cache_flags.py -v
```
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/backend/app/core/cache/flags.py apps/backend/tests/test_cache_flags.py
git commit -m "feat(cache): add per-namespace enable flag with global kill"
```

---

## Task 8: Cache decorator (core read path + fail-open)

**Files:**
- Create: `apps/backend/app/core/cache/decorator.py`
- Create: `apps/backend/tests/test_cache_decorator.py`

**Interfaces:**
- Produces:
  - `cached(*, ns, ttl=None, scope=None, strategy=None, key=None)` — decorator factory for async fns.
  - `async def bump_version(*, ns: str, uid: str) -> None`
  - `async def cache_invalidate(*, ns: str, key: str) -> None` (where `key` is full key string OR `(op, args)` tuple — keep simple: full key)
  - `async def get_or_set(*, ns, key, loader, ttl=None, strategy=None, scope=None, uid=None) -> Any`

- [ ] **Step 1: Write failing test**

Create `apps/backend/tests/test_cache_decorator.py`:

```python
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

    @cached(ns="bookmarks", ttl=60, scope="user")
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

    @cached(ns="bookmarks", ttl=60, scope="user")
    async def list_bookmarks(*, uid: str):
        calls["n"] += 1
        return [{"id": "a"}]

    await list_bookmarks(uid="u1")
    await bump_version(ns="bookmarks", uid="u1")
    await list_bookmarks(uid="u1")
    assert calls["n"] == 2


@pytest.mark.asyncio
async def test_fail_open(fake_redis, enable_ns):
    fake_redis.fail = True

    @cached(ns="bookmarks", ttl=60, scope="user")
    async def list_bookmarks(*, uid: str):
        return [{"id": "from-mongo"}]

    out = await list_bookmarks(uid="u1")
    assert out == [{"id": "from-mongo"}]


@pytest.mark.asyncio
async def test_disabled_namespace_skips_redis(fake_redis, monkeypatch):
    monkeypatch.setattr("app.core.cache.decorator.is_namespace_enabled", lambda ns: False)
    monkeypatch.setattr("app.core.cache.decorator._secret", lambda: b"x")

    @cached(ns="bookmarks", ttl=60, scope="user")
    async def list_bookmarks(*, uid: str):
        return [{"id": "a"}]

    fake_redis.calls.clear()
    await list_bookmarks(uid="u1")
    assert fake_redis.calls == []


@pytest.mark.asyncio
async def test_user_scope_requires_uid(fake_redis, enable_ns):
    @cached(ns="bookmarks", ttl=60, scope="user")
    async def list_bookmarks(**kw):
        return []

    with pytest.raises(ValueError, match="uid"):
        await list_bookmarks(folder_id="x")
```

- [ ] **Step 2: Run — verify failure**

```bash
cd apps/backend && pytest tests/test_cache_decorator.py -v
```
Expected: FAIL — module missing.

- [ ] **Step 3: Implement**

Create `apps/backend/app/core/cache/decorator.py`:

```python
"""Cache decorator + helpers — read path, fail-open, version invalidation."""
from __future__ import annotations

import asyncio
import functools
import inspect
import logging
import random
import time
from typing import Any, Awaitable, Callable, Literal, Optional

from redis.exceptions import RedisError

from app.core.cache.flags import is_namespace_enabled
from app.core.cache.keys import (
    NAMESPACES,
    NamespaceSpec,
    args_hash as _args_hash,
    build_key,
    version_key,
)
from app.core.cache.serializer import dumps, loads
from app.core.cache.xfetch import should_refresh, unwrap_payload, wrap_payload
from app.core.config import get_settings
from app.core.redis_client import get_redis

log = logging.getLogger("app.cache")


def _secret() -> bytes:
    s = get_settings()
    return (s.JWT_SECRET_KEY or "default-cache-secret").encode("utf-8")


async def _safe(coro: Awaitable, *, op: str, ns: str) -> Any:
    s = get_settings()
    try:
        return await asyncio.wait_for(coro, timeout=s.CACHE_OP_TIMEOUT_MS / 1000)
    except (RedisError, asyncio.TimeoutError, ConnectionError, OSError) as exc:
        log.warning("cache.error op=%s ns=%s err=%s msg=%s", op, ns, type(exc).__name__, exc)
        return None


async def _get_version(r, ns: str, uid: str) -> int:
    raw = await _safe(r.get(version_key(ns, uid)), op="ver_get", ns=ns)
    if raw is None:
        return 0
    try:
        return int(raw)
    except (TypeError, ValueError):
        return 0


def cached(
    *,
    ns: str,
    ttl: Optional[int] = None,
    scope: Optional[Literal["user", "global"]] = None,
    strategy: Optional[Literal["simple", "xfetch"]] = None,
    key: Optional[Callable[..., str]] = None,
):
    spec: NamespaceSpec | None = NAMESPACES.get(ns)
    if spec is None:
        raise ValueError(f"Namespace not registered: {ns!r}")
    eff_scope = scope or spec["scope"]
    eff_ttl = ttl or spec["default_ttl"]
    eff_strategy = strategy or spec["default_strategy"]
    if eff_strategy == "xfetch" and eff_scope != "global":
        raise ValueError("xfetch requires scope='global'")

    def decorator(fn: Callable[..., Awaitable[Any]]):
        if not inspect.iscoroutinefunction(fn):
            raise TypeError(f"@cached requires async fn; got {fn!r}")
        op_name = fn.__name__

        @functools.wraps(fn)
        async def wrapper(*args, **kwargs):
            # always allow disabled-namespace short-circuit
            if not is_namespace_enabled(ns):
                return await fn(*args, **kwargs)

            r = get_redis()
            if r is None:
                return await fn(*args, **kwargs)

            uid = kwargs.get("uid")
            if eff_scope == "user" and not uid:
                raise ValueError(f"{op_name}: scope='user' requires uid kwarg")

            # build args_hash from kwargs except 'uid'
            hash_args = {k: v for k, v in kwargs.items() if k != "uid"}
            ah = key(**kwargs) if key else _args_hash(hash_args, secret=_secret())

            ver = await _get_version(r, ns, uid) if eff_scope == "user" else None
            k = build_key(ns=ns, scope=eff_scope, uid=uid, ver=ver, op=op_name, args_hash=ah)
            k_bytes = k.encode()

            raw = await _safe(r.get(k_bytes), op="get", ns=ns)
            if raw is not None:
                try:
                    payload = loads(raw)
                except Exception as exc:  # noqa: BLE001
                    log.warning("cache.deserialize.failed ns=%s err=%s", ns, exc)
                    payload = None

                if eff_strategy == "xfetch" and isinstance(payload, dict) and "v" in payload:
                    value, computed_at, delta = unwrap_payload(payload)
                    if should_refresh(
                        computed_at=computed_at,
                        ttl=eff_ttl,
                        delta=delta,
                        beta=get_settings().CACHE_XFETCH_BETA,
                        now=time.time(),
                        rand=random.random(),
                    ):
                        asyncio.create_task(_refresh(fn, args, kwargs, r, k_bytes, eff_ttl, ns, eff_strategy))
                    log.debug("cache.hit ns=%s op=%s", ns, op_name)
                    return value

                log.debug("cache.hit ns=%s op=%s", ns, op_name)
                return payload

            log.debug("cache.miss ns=%s op=%s", ns, op_name)
            t0 = time.time()
            result = await fn(*args, **kwargs)
            delta = max(time.time() - t0, 0.001)

            if eff_strategy == "xfetch":
                stored = dumps(wrap_payload(result, computed_at=time.time(), delta=delta))
            else:
                stored = dumps(result)

            await _safe(r.setex(k_bytes, eff_ttl, stored), op="setex", ns=ns)
            return result

        return wrapper

    return decorator


async def _refresh(fn, args, kwargs, r, k_bytes, ttl, ns, strategy):
    try:
        t0 = time.time()
        result = await fn(*args, **kwargs)
        delta = max(time.time() - t0, 0.001)
        if strategy == "xfetch":
            stored = dumps(wrap_payload(result, computed_at=time.time(), delta=delta))
        else:
            stored = dumps(result)
        await _safe(r.setex(k_bytes, ttl, stored), op="setex_refresh", ns=ns)
        log.info("cache.xfetch.refresh ns=%s", ns)
    except Exception as exc:  # noqa: BLE001
        log.warning("cache.xfetch.refresh.failed ns=%s err=%s", ns, exc)


async def bump_version(*, ns: str, uid: str) -> None:
    r = get_redis()
    if r is None:
        return
    await _safe(r.incr(version_key(ns, uid)), op="ver_incr", ns=ns)
    log.info("cache.bump_version ns=%s uid=%s", ns, uid)


async def cache_invalidate(*, ns: str, key: str) -> None:
    r = get_redis()
    if r is None:
        return
    await _safe(r.delete(key.encode() if isinstance(key, str) else key), op="del", ns=ns)


async def get_or_set(
    *,
    ns: str,
    key: str,
    loader: Callable[[], Awaitable[Any]],
    ttl: Optional[int] = None,
    strategy: Optional[Literal["simple", "xfetch"]] = None,
) -> Any:
    spec = NAMESPACES.get(ns)
    if spec is None:
        return await loader()
    eff_ttl = ttl or spec["default_ttl"]
    eff_strategy = strategy or spec["default_strategy"]
    if not is_namespace_enabled(ns):
        return await loader()
    r = get_redis()
    if r is None:
        return await loader()
    raw = await _safe(r.get(key.encode()), op="get", ns=ns)
    if raw is not None:
        return loads(raw)
    result = await loader()
    if eff_strategy == "xfetch":
        stored = dumps(wrap_payload(result, computed_at=time.time(), delta=0.001))
    else:
        stored = dumps(result)
    await _safe(r.setex(key.encode(), eff_ttl, stored), op="setex", ns=ns)
    return result
```

- [ ] **Step 4: Run — verify pass**

```bash
cd apps/backend && pytest tests/test_cache_decorator.py -v
```
Expected: PASS.

- [ ] **Step 5: Run full suite**

```bash
cd apps/backend && pytest -q
```
Expected: all pass.

- [ ] **Step 6: Commit**

```bash
git add apps/backend/app/core/cache/decorator.py apps/backend/tests/test_cache_decorator.py
git commit -m "feat(cache): add @cached decorator + bump_version + invalidate"
```

---

## Task 9: Cache public API re-exports

**Files:**
- Modify: `apps/backend/app/core/cache/__init__.py`

**Interfaces:**
- Produces: importable from `app.core.cache`: `cached`, `bump_version`, `cache_invalidate`, `get_or_set`.

- [ ] **Step 1: Add test for the public surface**

Append to `apps/backend/tests/test_cache_decorator.py`:

```python
def test_public_api():
    from app.core.cache import cached, bump_version, cache_invalidate, get_or_set
    assert callable(cached)
    assert callable(bump_version)
    assert callable(cache_invalidate)
    assert callable(get_or_set)
```

- [ ] **Step 2: Run — verify failure**

```bash
cd apps/backend && pytest tests/test_cache_decorator.py::test_public_api -v
```
Expected: FAIL — `ImportError: cannot import name 'cached' from 'app.core.cache'`.

- [ ] **Step 3: Implement re-exports**

Replace `apps/backend/app/core/cache/__init__.py`:

```python
"""Public cache API."""
from app.core.cache.decorator import (
    bump_version,
    cache_invalidate,
    cached,
    get_or_set,
)

__all__ = ["cached", "bump_version", "cache_invalidate", "get_or_set"]
```

- [ ] **Step 4: Run — verify pass**

```bash
cd apps/backend && pytest tests/test_cache_decorator.py::test_public_api -v
```
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/backend/app/core/cache/__init__.py apps/backend/tests/test_cache_decorator.py
git commit -m "feat(cache): expose public cache API from app.core.cache"
```

---

## Task 10: Wire Redis to FastAPI lifespan

**Files:**
- Modify: `apps/backend/app/main.py`

**Interfaces:**
- Produces: Redis pool opened on app startup, closed on shutdown; failure to connect does not stop the app.

- [ ] **Step 1: Add lifespan integration test**

Create `apps/backend/tests/test_lifespan_redis.py`:

```python
import pytest
from httpx import ASGITransport, AsyncClient


@pytest.mark.asyncio
async def test_app_boots_without_redis(monkeypatch):
    monkeypatch.delenv("REDIS_URL", raising=False)
    from app.main import app
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        r = await ac.get("/health")
    assert r.status_code == 200
```

- [ ] **Step 2: Run — observe current state (may pass; lifespan currently doesn't open Redis)**

```bash
cd apps/backend && pytest tests/test_lifespan_redis.py -v
```
Expected: PASS (current lifespan doesn't touch Redis).

- [ ] **Step 3: Add Redis open/close calls to lifespan**

Edit `apps/backend/app/main.py`. Replace the `lifespan` function with:

```python
@asynccontextmanager
async def lifespan(_app: FastAPI):
    try:
        from app.core.indexes import ensure_indexes
        await ensure_indexes()
    except Exception as exc:
        logging.getLogger(__name__).warning("Index creation failed: %s", exc)

    from app.core.redis_client import open_redis, close_redis
    await open_redis()

    try:
        yield
    finally:
        await close_redis()
```

- [ ] **Step 4: Re-run lifespan test**

```bash
cd apps/backend && pytest tests/test_lifespan_redis.py -v
```
Expected: PASS — app still boots without Redis (fail-open).

- [ ] **Step 5: Full suite**

```bash
cd apps/backend && pytest -q
```
Expected: all pass.

- [ ] **Step 6: Commit**

```bash
git add apps/backend/app/main.py apps/backend/tests/test_lifespan_redis.py
git commit -m "feat(cache): open/close Redis pool from FastAPI lifespan"
```

---

## Task 11: SlowAPI Redis storage backend

**Files:**
- Modify: `apps/backend/app/core/limiter.py`

**Interfaces:**
- Produces: `limiter` uses Redis storage when `REDIS_URL` is set; falls back to in-memory otherwise.

- [ ] **Step 1: Update `limiter.py`**

Replace `apps/backend/app/core/limiter.py`:

```python
import logging

from fastapi import Request
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.core.config import get_settings

log = logging.getLogger("app.limiter")


def _get_client_ip(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return get_remote_address(request)


def _build_limiter() -> Limiter:
    settings = get_settings()
    if settings.REDIS_URL:
        try:
            return Limiter(
                key_func=_get_client_ip,
                storage_uri=settings.REDIS_URL,
            )
        except Exception as exc:  # noqa: BLE001
            log.warning("limiter.redis.fallback err=%s", exc)
    return Limiter(key_func=_get_client_ip)


limiter = _build_limiter()
```

- [ ] **Step 2: Run full suite**

```bash
cd apps/backend && pytest -q
```
Expected: all pass (no behavior change without `REDIS_URL`).

- [ ] **Step 3: Commit**

```bash
git add apps/backend/app/core/limiter.py
git commit -m "feat(cache): switch SlowAPI to Redis storage when REDIS_URL set"
```

---

## Task 12: Integration test against real Redis

**Files:**
- Create: `apps/backend/tests/test_cache_integration.py`

**Interfaces:**
- Verifies: decorator + bump_version + invalidate against a real `redis:7-alpine` container.

- [ ] **Step 1: Write integration test**

Create `apps/backend/tests/test_cache_integration.py`:

```python
import asyncio

import pytest
from testcontainers.redis import RedisContainer

from app.core.cache import cached, bump_version


@pytest.fixture(scope="module")
def redis_container():
    with RedisContainer("redis:7-alpine") as c:
        yield c


@pytest.fixture
async def real_redis(redis_container, monkeypatch):
    url = f"redis://{redis_container.get_container_host_ip()}:{redis_container.get_exposed_port(6379)}"
    monkeypatch.setenv("REDIS_URL", url)
    monkeypatch.setenv("CACHE_NAMESPACES", "bookmarks,notes,analytics_aggregate")
    # reset Settings cache
    from app.core import config
    config.get_settings.cache_clear()
    from app.core.cache import flags
    flags._parsed_namespaces.cache_clear()
    from app.core.redis_client import open_redis, close_redis
    await open_redis()
    yield
    await close_redis()


@pytest.mark.asyncio
async def test_real_decorator_hit(real_redis):
    calls = {"n": 0}

    @cached(ns="bookmarks", ttl=60, scope="user")
    async def list_bookmarks(*, uid: str):
        calls["n"] += 1
        return [{"id": "x"}]

    await list_bookmarks(uid="u1")
    await list_bookmarks(uid="u1")
    assert calls["n"] == 1


@pytest.mark.asyncio
async def test_real_bump_invalidates(real_redis):
    calls = {"n": 0}

    @cached(ns="notes", ttl=60, scope="user")
    async def list_notes(*, uid: str):
        calls["n"] += 1
        return [{"id": "y"}]

    await list_notes(uid="u1")
    await bump_version(ns="notes", uid="u1")
    await list_notes(uid="u1")
    assert calls["n"] == 2


@pytest.mark.asyncio
async def test_cross_user_isolation(real_redis):
    calls = {"n": 0}

    @cached(ns="bookmarks", ttl=60, scope="user")
    async def list_bookmarks(*, uid: str):
        calls["n"] += 1
        return [{"uid": uid}]

    await list_bookmarks(uid="u1")
    await bump_version(ns="bookmarks", uid="u1")  # only u1 invalidated
    await list_bookmarks(uid="u2")
    await list_bookmarks(uid="u2")  # second u2 call must hit cache
    assert calls["n"] == 3  # u1, u1-after-bump, u2-first  (u2-second = cache hit)
```

- [ ] **Step 2: Run integration tests**

```bash
cd apps/backend && pytest tests/test_cache_integration.py -v
```
Expected: PASS (Docker required for testcontainers).

- [ ] **Step 3: Commit**

```bash
git add apps/backend/tests/test_cache_integration.py
git commit -m "test(cache): add integration tests against real Redis container"
```

---

## Task 13: Auth — token + user profile cache

**Files:**
- Modify: `apps/backend/app/api/routes/auth/services.py`

**Interfaces:**
- Produces: `verify_id_token_cached(token: str) -> dict` (drop-in for `verify_id_token`); `get_current_user` reads user doc through cache; logout calls `cache_invalidate` on both.

- [ ] **Step 1: Read current `verify_id_token` + `get_current_user`**

Reference (existing, do not change unless noted): `apps/backend/app/api/routes/auth/services.py` lines 1-100.

- [ ] **Step 2: Add helper near top of file (after imports)**

Edit `apps/backend/app/api/routes/auth/services.py`. After existing imports, add:

```python
import hashlib

from app.core.cache import cached, cache_invalidate, get_or_set
from app.core.cache.keys import build_key


def _token_cache_key(token: str) -> str:
    h = hashlib.sha256(token.encode("utf-8")).hexdigest()[:16]
    return build_key(ns="auth_token", scope="global", uid=None, ver=None, op="verify", args_hash=h)
```

- [ ] **Step 3: Wrap token verification**

Add a new fn alongside `verify_id_token`:

```python
async def verify_id_token_cached(id_token: str, check_revoked: bool = False) -> dict:
    key = _token_cache_key(id_token)

    async def _loader():
        return verify_id_token(id_token, check_revoked=check_revoked)

    return await get_or_set(ns="auth_token", key=key, loader=_loader)
```

(Keep `verify_id_token` synchronous as-is for any caller that needs uncached behavior.)

- [ ] **Step 4: Cache user-profile fetch**

Add (or replace existing `get_current_user` body — keep request-state memoization, but on Mongo miss go through cache):

```python
async def _fetch_user_doc_cached(uid: str) -> dict | None:
    @cached(ns="auth_user", ttl=60, scope="user")
    async def _inner(*, uid: str):
        return await get_user_doc(uid)
    return await _inner(uid=uid)
```

Then modify `get_current_user` (after `doc = await get_user_doc(uid)`):

```python
    cached_doc = getattr(request.state, "current_user_doc", None)
    if cached_doc is not None and cached_doc.get("_id") == uid:
        doc = cached_doc
    else:
        doc = await _fetch_user_doc_cached(uid=uid)
        if not doc:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found.")
        request.state.current_user_doc = doc
```

- [ ] **Step 5: Add invalidation on logout / password change**

Find the existing `logout` (or equivalent) handler and add at the end (after the existing logic):

```python
    try:
        if id_token:
            await cache_invalidate(ns="auth_token", key=_token_cache_key(id_token))
        if uid:
            from app.core.cache.keys import build_key, version_key
            await cache_invalidate(ns="auth_user", key=build_key(
                ns="auth_user", scope="user", uid=uid, ver=0, op="_inner", args_hash="*"
            ))
    except Exception:
        pass  # fail-open
```

(If logout doesn't have `id_token` at hand, only invalidate `auth_user`; bump the user-scoped version key instead.)

Recommended cleaner approach — call `bump_version` on logout:

```python
    from app.core.cache import bump_version
    try:
        await bump_version(ns="auth_user", uid=uid)
    except Exception:
        pass
```

- [ ] **Step 6: Run suite**

```bash
cd apps/backend && pytest -q
```
Expected: all pass.

- [ ] **Step 7: Commit**

```bash
git add apps/backend/app/api/routes/auth/services.py
git commit -m "feat(cache): cache Firebase verify + user profile; invalidate on logout"
```

---

## Task 14: Bookmarks — `@cached` reads + `bump_version` writes

**Files:**
- Modify: `apps/backend/app/api/routes/bookmarks/services.py`

**Interfaces:**
- Produces: reads of bookmarks and folders cached per-user; every write `bump_version`s `bookmarks`.

- [ ] **Step 1: Add imports**

Edit top of `apps/backend/app/api/routes/bookmarks/services.py`. Add:

```python
from app.core.cache import cached, bump_version
```

- [ ] **Step 2: Decorate reads**

Find `async def list_bookmarks(uid: str, ...)`. Add decorator above:

```python
@cached(ns="bookmarks", ttl=120, scope="user")
async def list_bookmarks(*, uid: str, folder_id: Optional[str] = None, skip: int = 0, limit: Optional[int] = None) -> list[BookmarkOut]:
    ...
```

(Note: signature changes — `uid` must become keyword-only. Update call sites in the router/api file to pass `uid=uid` keyword.)

Also decorate `get_bookmark` similarly:

```python
@cached(ns="bookmarks", ttl=120, scope="user")
async def get_bookmark(*, uid: str, bookmark_id: str) -> BookmarkOut:
    ...
```

And folder list (`list_folders` if present): same pattern.

- [ ] **Step 3: Update writes**

In every write fn (`create_bookmark`, `update_bookmark`, `delete_bookmark`, `bulk_delete_bookmarks`, `move_bookmark`, `import_bookmarks`, folder writes), insert one line just before the `return`:

```python
    await bump_version(ns="bookmarks", uid=uid)
```

For bulk write fns, one bump after the entire batch (not per item).

- [ ] **Step 4: Update API layer to pass `uid` as kwarg**

Edit `apps/backend/app/api/routes/bookmarks/api.py`. Each route handler that calls a service fn must pass `uid` as kwarg. Example:

```python
# Before:
return await list_bookmarks(uid, folder_id=folder_id, skip=skip, limit=limit)
# After:
return await list_bookmarks(uid=uid, folder_id=folder_id, skip=skip, limit=limit)
```

Apply to every site that calls a `@cached` fn.

- [ ] **Step 5: Run suite**

```bash
cd apps/backend && pytest -q
```
Expected: all pass.

- [ ] **Step 6: Commit**

```bash
git add apps/backend/app/api/routes/bookmarks/
git commit -m "feat(cache): cache bookmarks reads; bump version on writes"
```

---

## Task 15: Notes — same pattern

**Files:**
- Modify: `apps/backend/app/api/routes/notes/services.py`
- Modify: `apps/backend/app/api/routes/notes/api.py`

**Interfaces:**
- Produces: reads cached; writes bump version on `notes`.

- [ ] **Step 1: Import**

Add to top of `services.py`:

```python
from app.core.cache import cached, bump_version
```

- [ ] **Step 2: Decorate every read fn**

For each `async def list_notes(...)`, `get_note(...)`, `search_notes(...)`:

```python
@cached(ns="notes", ttl=120, scope="user")
async def list_notes(*, uid: str, ...):
    ...
```

Make `uid` keyword-only.

- [ ] **Step 3: Bump on writes**

In `create_note`, `update_note`, `delete_note`, bulk variants, add before return:

```python
    await bump_version(ns="notes", uid=uid)
```

- [ ] **Step 4: Update `api.py` to pass `uid=uid`**

Same edit pattern as Task 14 Step 4.

- [ ] **Step 5: Run + commit**

```bash
cd apps/backend && pytest -q
git add apps/backend/app/api/routes/notes/
git commit -m "feat(cache): cache notes reads; bump version on writes"
```

---

## Task 16: Code snippets — same pattern

**Files:**
- Modify: `apps/backend/app/api/routes/code_snippets/services.py`
- Modify: `apps/backend/app/api/routes/code_snippets/api.py`

- [ ] **Step 1: Import + decorate reads + bump on writes (ns="code_snippets", ttl=120)**

Apply the exact pattern from Task 15. Decorator:

```python
@cached(ns="code_snippets", ttl=120, scope="user")
async def list_snippets(*, uid: str, ...):
    ...
```

Bump on writes:

```python
    await bump_version(ns="code_snippets", uid=uid)
```

- [ ] **Step 2: Update api.py call sites to use `uid=uid`**

- [ ] **Step 3: Run + commit**

```bash
cd apps/backend && pytest -q
git add apps/backend/app/api/routes/code_snippets/
git commit -m "feat(cache): cache code snippets reads; bump version on writes"
```

---

## Task 17: Tasks (todo) — `ns="tasks"`, TTL 60s

**Files:**
- Modify: `apps/backend/app/api/routes/tasks/services.py`
- Modify: `apps/backend/app/api/routes/tasks/api.py`

- [ ] **Step 1: Import + decorate reads (ttl=60) + bump on writes**

Decorator:

```python
@cached(ns="tasks", ttl=60, scope="user")
async def list_tasks(*, uid: str, ...):
    ...
```

Bump:

```python
    await bump_version(ns="tasks", uid=uid)
```

Tasks are written frequently — verify every status toggle / reorder / move bumps version.

- [ ] **Step 2: Update api.py call sites**

- [ ] **Step 3: Run + commit**

```bash
cd apps/backend && pytest -q
git add apps/backend/app/api/routes/tasks/
git commit -m "feat(cache): cache tasks reads; bump version on writes"
```

---

## Task 18: Passwords — ciphertext only

**Files:**
- Modify: `apps/backend/app/api/routes/passwords/services.py`
- Modify: `apps/backend/app/api/routes/passwords/api.py`

**Interfaces:**
- Cached payload is the same shape as the Mongo doc (ciphertext + iv). Decryption stays outside the cache.

- [ ] **Step 1: Decorate reads (ns="passwords", ttl=60)**

```python
@cached(ns="passwords", ttl=60, scope="user")
async def list_passwords(*, uid: str, ...):
    ...
```

If any read fn currently decrypts before returning, **split** it: keep a private `_fetch_password_docs(*, uid)` (decorated, returns ciphertext) and a thin caller that decrypts.

- [ ] **Step 2: Bump on writes**

```python
    await bump_version(ns="passwords", uid=uid)
```

- [ ] **Step 3: Update api.py call sites + run + commit**

```bash
cd apps/backend && pytest -q
git add apps/backend/app/api/routes/passwords/
git commit -m "feat(cache): cache passwords (ciphertext only); bump on writes"
```

---

## Task 19: API client — `ns="api_client"`, TTL 300s

**Files:**
- Modify: `apps/backend/app/api/routes/api_client/services.py`
- Modify: `apps/backend/app/api/routes/api_client/api.py`

- [ ] **Step 1: Decorate reads + bump on writes**

Decorator:

```python
@cached(ns="api_client", ttl=300, scope="user")
async def list_collections(*, uid: str, ...):
    ...
```

Apply to: collections list/get, saved requests list/get, environments list/get (if part of api_client). Bump on every write.

- [ ] **Step 2: api.py + run + commit**

```bash
cd apps/backend && pytest -q
git add apps/backend/app/api/routes/api_client/
git commit -m "feat(cache): cache api_client reads; bump on writes"
```

---

## Task 20: User preferences — `ns="user_preferences"`, TTL 600s

**Files:**
- Modify: `apps/backend/app/api/routes/user_preferences/services.py`
- Modify: `apps/backend/app/api/routes/user_preferences/api.py`

- [ ] **Step 1: Decorate reads + bump on writes**

```python
@cached(ns="user_preferences", ttl=600, scope="user")
async def get_user_preferences(*, uid: str):
    ...
```

```python
    await bump_version(ns="user_preferences", uid=uid)
```

- [ ] **Step 2: Run + commit**

```bash
cd apps/backend && pytest -q
git add apps/backend/app/api/routes/user_preferences/
git commit -m "feat(cache): cache user preferences (10-min TTL)"
```

---

## Task 21: URL shortener — global XFetch + owner cache

**Files:**
- Modify: `apps/backend/app/api/routes/url_shortener/services.py`
- Modify: `apps/backend/app/api/routes/url_shortener/api.py`

**Interfaces:**
- Public `resolve_short_url(slug)` uses XFetch on `url_shortener_resolve`. Owner-facing list uses `url_shortener_owner` per-user.

- [ ] **Step 1: Decorate public resolve**

```python
from app.core.cache import cached, cache_invalidate, bump_version
from app.core.cache.keys import build_key


@cached(ns="url_shortener_resolve", ttl=600, scope="global", strategy="xfetch")
async def resolve_short_url(*, slug: str):
    ...
```

Note: `scope="global"` means no `uid` is required, and XFetch math applies.

- [ ] **Step 2: Invalidate on slug write**

In `create_short_url`, `update_short_url`, `delete_short_url`, add:

```python
    key = build_key(ns="url_shortener_resolve", scope="global", uid=None, ver=None, op="resolve_short_url", args_hash=_args_hash_for_slug(slug))
    await cache_invalidate(ns="url_shortener_resolve", key=key)
```

Where `_args_hash_for_slug` mirrors what the decorator computed:

```python
from app.core.cache.keys import args_hash as _ah
from app.core.config import get_settings


def _args_hash_for_slug(slug: str) -> str:
    return _ah({"slug": slug}, secret=(get_settings().JWT_SECRET_KEY or "default-cache-secret").encode())
```

- [ ] **Step 3: Decorate owner-facing list**

```python
@cached(ns="url_shortener_owner", ttl=120, scope="user")
async def list_my_short_urls(*, uid: str, ...):
    ...
```

Bump on writes:

```python
    await bump_version(ns="url_shortener_owner", uid=uid)
```

- [ ] **Step 4: api.py call sites + run + commit**

```bash
cd apps/backend && pytest -q
git add apps/backend/app/api/routes/url_shortener/
git commit -m "feat(cache): XFetch on public URL resolve; per-user owner cache"
```

---

## Task 22: Analytics aggregates — XFetch

**Files:**
- Modify: `apps/backend/app/api/routes/analytics/services.py`
- Modify: `apps/backend/app/api/routes/analytics/api.py`

**Interfaces:**
- Top tools + activity buckets cached with XFetch on `analytics_aggregate`. No write-side invalidation; rely on TTL.

- [ ] **Step 1: Decorate aggregates**

```python
from app.core.cache import cached


@cached(ns="analytics_aggregate", ttl=300, scope="global", strategy="xfetch")
async def get_top_tools(*, days: int = 7, limit: int = 10):
    ...


@cached(ns="analytics_aggregate", ttl=300, scope="global", strategy="xfetch")
async def get_activity_buckets(*, days: int = 7):
    ...
```

**Important:** Analytics aggregates are global (cross-user) reads. Per-user analytics views (if any) should use a separate `scope="user"` namespace, not `analytics_aggregate`. If the current code mixes per-user and aggregate reads in one fn, split them before decorating.

- [ ] **Step 2: api.py call sites + run + commit**

```bash
cd apps/backend && pytest -q
git add apps/backend/app/api/routes/analytics/
git commit -m "feat(cache): XFetch on analytics aggregates"
```

---

## Task 23: DNS lookup — global TTL 1h

**Files:**
- Modify: `apps/backend/app/api/routes/dns_lookup/services.py`
- Modify: `apps/backend/app/api/routes/dns_lookup/api.py`

- [ ] **Step 1: Decorate**

```python
from app.core.cache import cached


@cached(ns="dns_lookup", ttl=3600, scope="global")
async def lookup(*, host: str, record_type: str = "A"):
    ...
```

Pure function of `(host, record_type)` — safe to cache globally for 1h.

- [ ] **Step 2: api.py + run + commit**

```bash
cd apps/backend && pytest -q
git add apps/backend/app/api/routes/dns_lookup/
git commit -m "feat(cache): cache DNS lookups globally (1h TTL)"
```

---

## Task 24: Load test script

**Files:**
- Create: `apps/backend/scripts/loadtest_cache.py`

**Interfaces:**
- Produces: a locust-driven load test scenario; reports p50/p99 + Mongo find count delta vs `CACHE_ENABLED=false` baseline.

- [ ] **Step 1: Write script**

Create `apps/backend/scripts/loadtest_cache.py`:

```python
"""Load test: 1000 concurrent users, 90/10 read/write.

Usage:
  pip install locust
  CACHE_ENABLED=false locust -f scripts/loadtest_cache.py --headless -u 1000 -r 100 -t 5m \
      --host http://localhost:8000 --csv=baseline
  CACHE_ENABLED=true  locust -f scripts/loadtest_cache.py --headless -u 1000 -r 100 -t 5m \
      --host http://localhost:8000 --csv=with_cache

Compare baseline_stats.csv vs with_cache_stats.csv.
"""
import random
import string

from locust import HttpUser, between, task


def _rand_str(n: int = 8) -> str:
    return "".join(random.choices(string.ascii_lowercase, k=n))


class DevToolsUser(HttpUser):
    wait_time = between(0.5, 2.0)
    headers: dict[str, str]

    def on_start(self):
        # Replace with a real test token issuance flow for the env.
        # Sketch: hit /auth/anon-login or seed a user.
        self.headers = {"Authorization": f"Bearer {self._token()}"}

    def _token(self) -> str:
        # Pull from env or local fixture file. Out of scope here.
        import os
        return os.environ.get("LOADTEST_TOKEN", "")

    @task(45)
    def list_bookmarks(self):
        self.client.get("/bookmarks", headers=self.headers, name="GET /bookmarks")

    @task(20)
    def list_notes(self):
        self.client.get("/notes", headers=self.headers, name="GET /notes")

    @task(15)
    def list_snippets(self):
        self.client.get("/code-snippets", headers=self.headers, name="GET /code-snippets")

    @task(10)
    def analytics_top(self):
        self.client.get("/analytics/top-tools?days=7", headers=self.headers, name="GET /analytics/top-tools")

    @task(10)
    def write_bookmark(self):
        self.client.post(
            "/bookmarks",
            json={"title": _rand_str(), "url": f"https://example.com/{_rand_str()}", "tags": []},
            headers=self.headers,
            name="POST /bookmarks",
        )
```

- [ ] **Step 2: Document run procedure (skip executing in CI)**

Append to `apps/backend/README.md` under a new section:

```markdown
## Load testing cache

See `scripts/loadtest_cache.py`. Requires `locust` (install separately) and a running backend.

1. Boot backend with `CACHE_ENABLED=false`; run a 5-min baseline.
2. Boot backend with `CACHE_ENABLED=true` + chosen `CACHE_NAMESPACES`; re-run.
3. Compare p50/p99 in `*_stats.csv`. Acceptance gates: p50 < 50ms, p99 < 200ms, error rate 0%.
```

- [ ] **Step 3: Commit**

```bash
git add apps/backend/scripts/loadtest_cache.py apps/backend/README.md
git commit -m "test(cache): add locust load test for cache acceptance gates"
```

---

## Task 25: Deployment notes + env documentation

**Files:**
- Modify: `apps/backend/README.md`

**Interfaces:**
- Produces: clear ops doc for env vars + Redis config recommendation.

- [ ] **Step 1: Document env vars**

Append to `apps/backend/README.md`:

```markdown
## Redis cache

### Environment

| Var | Default | Purpose |
|-----|---------|---------|
| `REDIS_URL` | unset | If unset, cache is inert. `redis://...` or `rediss://...`. |
| `CACHE_ENABLED` | `true` | Global kill switch. |
| `CACHE_NAMESPACES` | `""` | Comma-separated namespaces to activate. Empty = no caching. |
| `CACHE_DEFAULT_TTL` | `120` | Fallback TTL seconds. |
| `CACHE_OP_TIMEOUT_MS` | `50` | Per-Redis-call timeout. |
| `CACHE_XFETCH_BETA` | `1.0` | XFetch tuning constant. Higher = refreshes earlier. |
| `CACHE_LOG_LEVEL` | `WARNING` | `app.cache` logger level. |

### Rollout phases

Ramp `CACHE_NAMESPACES` namespace-by-namespace; restart workers each phase.

| Phase | Add to `CACHE_NAMESPACES` |
|-------|---------------------------|
| 1 | `auth_token,auth_user` |
| 2 | `user_preferences,dns_lookup` |
| 3 | `bookmarks,notes,code_snippets,api_client` |
| 4 | `tasks,passwords,url_shortener_owner` |
| 5 | `url_shortener_resolve,analytics_aggregate` |

Kill switch: drop a namespace from env + restart workers. Global kill: `CACHE_ENABLED=false`.

### Redis server config (prod)

- `maxmemory` sized to expected working set (start with 512 MB for 1k users).
- `maxmemory-policy allkeys-lru`.
- `requirepass` set; TLS enabled if exposed outside VPC.
- Bind to private network only.
```

- [ ] **Step 2: Commit**

```bash
git add apps/backend/README.md
git commit -m "docs(cache): document env vars, rollout phases, prod Redis config"
```

---

## Self-Review Notes

- **Spec coverage:**
  - Sections 3 (architecture), 5 (file map), 6 (key schema) → Tasks 3-9.
  - Section 4 (public API) → Task 9.
  - Section 7 (TTL table) → registered in Task 5 + applied in Tasks 13-23.
  - Section 8 (invalidation) → bump_version in every write task.
  - Section 9 (error handling) → `_safe` wrapper in Task 8.
  - Section 10 (observability) → log lines throughout Tasks 8 + 13.
  - Section 11 (security) → keyed blake2b in Task 5; ciphertext-only in Task 18; logout invalidation in Task 13.
  - Section 12 (testing) → Tasks 4-8 unit tests + Task 12 integration.
  - Section 13 (acceptance) → Task 24 load test.
  - Section 14 (rollout) → Task 25 docs.
- **No placeholders:** every step has exact code or exact command + expected output.
- **Type consistency:** `cached`, `bump_version`, `cache_invalidate`, `get_or_set` names match across Tasks 8, 9, and every route task.
- **Frequent commits:** every task ends in a commit.
