# Redis Caching Masterplan — Design Spec

**Status:** Draft for review
**Date:** 2026-06-22
**Author:** Akhil (with Claude)
**Scope:** FastAPI backend (`apps/backend/`) — full Redis caching platform

## 1. Goal

Introduce a production-grade Redis caching layer across the FastAPI backend that:

- Cuts MongoDB read load by ≥60% on cached collections.
- Brings p50 list-endpoint latency under 50ms and p99 under 200ms.
- Survives Redis outages without taking the app down (fail-open).
- Rolls out namespace-by-namespace with a global kill switch.
- Handles thundering-herd on hot aggregate keys via probabilistic early refresh.

Non-goal: multi-region replication, Redis Cluster, Prometheus integration, in-process L1 cache (beyond a 5s version-key short-circuit).

## 2. Constraints & Decisions (locked)

| Topic | Decision |
|-------|----------|
| Scope | Full caching platform (foundation + read caching across all read-heavy routes + dogpile protection + observability + flagged rollout). |
| Hosting | Local `redis://localhost:6379` in dev; single managed Redis node in prod (DigitalOcean / Railway / Render). |
| Invalidation | **D-hybrid** — versioned keys for per-user data, short TTL for cross-user aggregates. |
| Failure mode | Fail-open. Cache errors degrade to direct DB reads. Logged. |
| Observability | Structured logs only. No Prometheus in scope. |
| Rollout | Per-namespace env flag (`CACHE_NAMESPACES`) + global `CACHE_ENABLED` kill switch. |
| Serialization | orjson. No pickle. Keyed `blake2b` hash for arg keys. |
| Stampede protection | None for per-user namespaces; XFetch (probabilistic early refresh) for aggregates, exposed via `strategy="xfetch"` decorator flag. |
| Architecture shape | Decorator-on-service-fns is primary surface. XFetch math hidden inside decorator. |
| Success metrics | Latency + hit ratio + Mongo load + 1000-concurrent load test, all zero-error. |

## 3. Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     FastAPI Worker (×N)                          │
│                                                                  │
│   request → router → service fn (@cached) → cache facade        │
│                                  │                               │
│                                  ▼                               │
│                      ┌───────────────────────┐                  │
│                      │  app.core.cache       │                  │
│                      │  - decorator          │                  │
│                      │  - get_or_set         │                  │
│                      │  - bump_version       │                  │
│                      │  - serializer (orjson)│                  │
│                      │  - xfetch math        │                  │
│                      │  - per-ns enable flag │                  │
│                      │  - fail-open wrapper  │                  │
│                      └──────────┬────────────┘                  │
│                                 │                                │
│                                 ▼                                │
│                    ┌──────────────────────┐                     │
│                    │ app.core.redis_client│  ← lazy async pool  │
│                    └──────────┬───────────┘                     │
└────────────────────────────────┼─────────────────────────────────┘
                                 │
                                 ▼
                  ┌──────────────────────────┐
                  │   Redis (single node)    │
                  │   - cache:* keys         │
                  │   - ratelimit:* (SlowAPI)│
                  │   - tokver:* (auth)      │
                  └──────────────────────────┘
```

Layers:

- **`redis_client`** — singleton async `redis.asyncio.Redis` pool, opened in FastAPI lifespan, pinged on startup. Shared by cache + SlowAPI + token cache.
- **`cache`** — single facade module. Decorator + helpers. All routes import only from this.
- **service fns** — annotated with `@cached(ns=..., ttl=..., strategy=...)`. Writes call `await bump_version(ns, uid)` or `await cache_invalidate(ns, key)`.

## 4. Public API

From `app.core.cache`:

```python
@cached(ns="bookmarks", ttl=120, scope="user")                          # per-user
@cached(ns="urlshort", ttl=600, scope="global", strategy="xfetch")      # aggregate
await bump_version(ns="bookmarks", uid=uid)                             # on writes
await cache_invalidate(ns="urlshort", key="resolve:slug=gh")            # explicit drop
await get_or_set(ns=..., key=..., loader=..., ttl=..., strategy=...)    # escape hatch
```

Decorator parameters:

| Param | Type | Default | Notes |
|-------|------|---------|-------|
| `ns` | str | required | Must be registered in namespace registry |
| `ttl` | int | required | Seconds |
| `scope` | `"user" \| "global"` | `"user"` | `"user"` requires `uid` kwarg at call time |
| `strategy` | `"simple" \| "xfetch"` | `"simple"` | XFetch requires `scope="global"` |
| `key` | callable \| None | None | Custom key builder; default = blake2b of sorted kwargs |

## 5. Components & File Map

| File | Status | Purpose |
|------|--------|---------|
| `apps/backend/pyproject.toml` | modify | Add `redis[asyncio]>=5.0`, `orjson>=3.10` |
| `apps/backend/app/core/config.py` | modify | Add `REDIS_URL`, `CACHE_ENABLED`, `CACHE_NAMESPACES`, `CACHE_DEFAULT_TTL`, `CACHE_LOG_LEVEL`, `CACHE_OP_TIMEOUT_MS`, `CACHE_XFETCH_BETA` |
| `apps/backend/app/core/redis_client.py` | **new** | Lazy async Redis pool, lifespan open/close, ping on startup |
| `apps/backend/app/core/cache/__init__.py` | **new** | Public API exports |
| `apps/backend/app/core/cache/decorator.py` | **new** | `@cached` + simple/xfetch read paths + fail-open wrapper |
| `apps/backend/app/core/cache/keys.py` | **new** | Key builder, version key resolver, namespace registry |
| `apps/backend/app/core/cache/serializer.py` | **new** | orjson encode/decode, Pydantic and datetime handling |
| `apps/backend/app/core/cache/xfetch.py` | **new** | Probabilistic early-expiration math |
| `apps/backend/app/core/cache/flags.py` | **new** | `is_namespace_enabled(ns)` |
| `apps/backend/app/main.py` | modify | Wire Redis pool open/close to FastAPI lifespan |
| `apps/backend/app/core/limiter.py` | modify | Switch SlowAPI to Redis storage backend |
| `apps/backend/app/api/routes/auth/services.py` | modify | Cache `verify_token` + `get_current_user`; invalidate on logout / password change |
| `apps/backend/app/api/routes/bookmarks/services.py` | modify | `@cached` on reads; `bump_version` on writes |
| `apps/backend/app/api/routes/notes/services.py` | modify | same pattern |
| `apps/backend/app/api/routes/code_snippets/services.py` | modify | same |
| `apps/backend/app/api/routes/tasks/services.py` | modify | same |
| `apps/backend/app/api/routes/passwords/services.py` | modify | same (ciphertext only) |
| `apps/backend/app/api/routes/api_client/services.py` | modify | same |
| `apps/backend/app/api/routes/user_preferences/services.py` | modify | same |
| `apps/backend/app/api/routes/url_shortener/services.py` | modify | `@cached(strategy="xfetch", scope="global")` on public resolves; `scope="user"` for owner list |
| `apps/backend/app/api/routes/analytics/services.py` | modify | `@cached(strategy="xfetch")` on aggregates |
| `apps/backend/app/api/routes/dns_lookup/services.py` | modify | `@cached(scope="global")` on pure-fn lookups |
| `tests/test_cache_core.py` | **new** | Unit: decorator, version, xfetch math, fail-open, namespace flag |
| `tests/test_cache_integration.py` | **new** | Integration with real Redis container |
| `scripts/loadtest_cache.py` | **new** | k6 / locust scenario for 1000 concurrent |

## 6. Key Schema

```
cache:{ns}:{scope_part}:v{ver}:{op}:{arg_hash}
```

- `ns` — namespace; must match `CACHE_NAMESPACES`.
- `scope_part` — `u:{uid}` for `scope="user"`, `g` for `scope="global"`.
- `v{ver}` — version int from `cache:ver:{ns}:u:{uid}`; omitted for `scope="global"` (TTL only).
- `op` — fn name + variant (`list`, `get`, `search:tag`, ...).
- `arg_hash` — `blake2b(orjson(sorted_kwargs), key=APP_SECRET)[:16]` hex.

Examples:

```
cache:bookmarks:u:abc123:v7:list:8f3a1c0d2e4b5a78
cache:notes:u:abc123:v2:get:id=xyz
cache:urlshort:g:resolve:slug=gh
cache:analytics:g:top_tools:days=7
cache:auth_token:g:verify:7a4b2c9d1e0f3a8b   ← key = sha256(token)[:16]
cache:auth_user:u:abc123
```

Version keys (no TTL, INCR-only):

```
cache:ver:bookmarks:u:abc123  → 7
cache:ver:notes:u:abc123      → 2
```

If Redis is flushed, INCR returns 1 — all old version-bearing keys become orphans and evict via their own TTL.

## 7. TTL & Strategy Table

| Namespace | Scope | TTL | Strategy | Notes |
|-----------|-------|-----|----------|-------|
| `auth_token` | global | 300s | simple | Firebase JWT verify result; key = sha256(token)[:16] |
| `auth_user` | user | 60s | simple | Mongo user-profile lookup |
| `bookmarks` | user | 120s | simple | List + get + search |
| `notes` | user | 120s | simple | List + get |
| `code_snippets` | user | 120s | simple | List + get |
| `tasks` | user | 60s | simple | List (frequent writes) |
| `passwords` | user | 60s | simple | Ciphertext only |
| `api_client` | user | 300s | simple | Collections + saved requests |
| `user_preferences` | user | 600s | simple | Rarely changes |
| `url_shortener_resolve` | global | 600s | xfetch | Hot, public, read-heavy |
| `url_shortener_owner` | user | 120s | simple | Owner's own short URLs list |
| `analytics_aggregate` | global | 300s | xfetch | Top tools, activity buckets |
| `dns_lookup` | global | 3600s | simple | Pure fn of (host, type) |

Memory budget estimate: ~80MB at 1000 active users (8 namespaces × 5 keys × ~2KB serialized). Single node sufficient.

Redis deployment config: `maxmemory-policy allkeys-lru`. Documented in deployment notes.

## 8. Invalidation & Write Paths

**Per-user pattern (90% of writes):**

```python
async def create_bookmark(uid: str, body: BookmarkCreate) -> BookmarkOut:
    doc = {...}
    await db_manager.insert_one(BOOKMARKS, doc)
    await bump_version(ns="bookmarks", uid=uid)   # one line
    return _doc_to_out(doc)
```

`bump_version` = `INCR cache:ver:bookmarks:u:{uid}`. Atomic, single round-trip. All cached keys for that (ns, uid) instantly orphaned.

Bulk writes get one bump, not N.

**Read path (decorator-internal):**

```
1. ver = await redis.get(f"cache:ver:{ns}:u:{uid}") or "0"
   (in-process 5s LRU cache to skip this round-trip on hot loops)
2. key = f"cache:{ns}:u:{uid}:v{ver}:{op}:{arg_hash}"
3. cached = await redis.get(key)
4. if cached: deserialize + return
5. result = await fn(...)
6. await redis.setex(key, ttl, serialize(result))
7. return result
```

**Global-namespace writes:**

| Trigger | Action |
|---------|--------|
| Create/update/delete short URL | `cache_invalidate(ns="url_shortener_resolve", key=f"resolve:slug={slug}")` |
| Usage event logged (analytics) | No invalidation — TTL handles it. Stale 30-300s acceptable for charts. |
| Logout / password change | `cache_invalidate(ns="auth_token", key=token_hash)` + `cache_invalidate(ns="auth_user", key=uid)` |

**XFetch (stale-while-revalidate):**

Stored payload carries `(value, computed_at, ttl, delta)`. On read:

```python
if now > computed_at + ttl - beta * delta * ln(random()):
    asyncio.create_task(refresh())   # single request rebuilds
return value                          # all others serve stale, no wait
```

- `beta` = `CACHE_XFETCH_BETA` (default 1.0).
- `delta` = rolling-average measured fn runtime, stored alongside payload.

## 9. Error Handling

All Redis calls wrapped:

```python
async def _safe(coro, *, op: str, ns: str):
    try:
        return await asyncio.wait_for(coro, timeout=CACHE_OP_TIMEOUT_MS / 1000)
    except (RedisError, asyncio.TimeoutError, ConnectionError) as e:
        log.warning("cache.error", op=op, ns=ns, err=type(e).__name__, msg=str(e))
        return None  # treat as miss
```

- `CACHE_OP_TIMEOUT_MS = 50` default. Better to miss than block.
- Write-path `bump_version` also fail-open: log + continue. Worst case: one user serves stale until TTL.
- Startup `redis.ping()` failure → log error, set runtime `CACHE_ENABLED=false`, app continues booting.

## 10. Observability

Single logger `app.cache`. Events:

| Event | Level | Fields |
|-------|-------|--------|
| `cache.hit` | DEBUG | ns, op, latency_us |
| `cache.miss` | DEBUG | ns, op |
| `cache.set` | DEBUG | ns, op, size_bytes, ttl |
| `cache.bump_version` | INFO | ns, uid |
| `cache.error` | WARN | ns, op, err, msg |
| `cache.xfetch.refresh` | INFO | ns, key, age_s |
| `cache.namespace_disabled` | DEBUG | ns |

Prod default: `cache.*` at WARN+. Set `CACHE_LOG_LEVEL=DEBUG` for live hit-rate debugging.

## 11. Security

| Concern | Mitigation |
|---------|------------|
| Cache poisoning (cross-user) | All user-scoped keys include `u:{uid}` from authenticated context. Decorator rejects `scope="user"` without `uid` kwarg at runtime. |
| Sensitive data leak | Passwords cached as ciphertext only. JWTs never cached — only verification result. Audit-log writes never cached. |
| Hash collision | `arg_hash = blake2b(orjson(kwargs), key=APP_SECRET)[:16]`. Keyed hash, 64-bit, collision-resistant up to ~10⁹ keys. |
| Pickle RCE | orjson only. No pickle import in cache module. |
| Redis exposure | Localhost in dev. Prod: VPC-only + `requirepass` + TLS. Documented in deployment notes. |
| Auth revocation | Logout / password change must call `cache_invalidate` on `auth_token` + `auth_user`. Token-cache TTL ≤ Firebase token validity. |

## 12. Testing

**Unit (`tests/test_cache_core.py`):**

- Key builder: deterministic, kwargs order-insensitive, collision check across 10k random inputs.
- Version bump: INCR semantics, missing-key → 1.
- XFetch math: monotonic refresh probability; beta=0 ≡ TTL-only; beta=1 fires ~10% before expiry on average.
- Serializer: round-trip Pydantic, datetime, bytes, None, nested.
- Fail-open: Redis stub raises → returns None, no exception bubbles.
- Namespace flag: disabled ns → zero Redis calls.

**Integration (`tests/test_cache_integration.py`):**

- Real Redis via `testcontainers` or local `redis:7-alpine`.
- One test per cached service fn: miss → hit → invalidate → miss.
- Write-then-read invalidation: create_bookmark → list_bookmarks reflects new doc immediately.
- Cross-user isolation: user A's bump doesn't affect user B's cache.
- Logout invalidates token + user caches.
- Concurrent reads on per-user miss: N parallel reads → N Mongo calls (no lock by design).

**Load test (`scripts/loadtest_cache.py`):**

- Scenario A: 1000 concurrent, 90/10 read/write.
- Scenario B: same with `CACHE_ENABLED=false` (baseline).
- Compare p50/p99 latency, Mongo `find()` count, error rate.

## 13. Acceptance Criteria

All must pass before declaring done:

- [ ] p50 list-endpoint latency < 50ms.
- [ ] p99 list-endpoint latency < 200ms.
- [ ] Per-user hit ratio ≥ 80% after 5-min warm.
- [ ] Aggregate hit ratio ≥ 95% after 5-min warm.
- [ ] Mongo `find()` per minute on cached collections reduced ≥ 60%.
- [ ] 1000-concurrent load test: 0% error rate.
- [ ] Existing test suite passes (`pytest -q`).
- [ ] All routes still work with `CACHE_ENABLED=false`.

## 14. Rollout Phases

Deploy code with all namespaces inactive; ramp via `CACHE_NAMESPACES`:

| Phase | Namespaces added | Notes |
|-------|------------------|-------|
| 0 | (empty) | Code shipped, decorators no-op. Verify zero regression. |
| 1 | `auth_token,auth_user` | Lowest risk, biggest Firebase saving. ≥48h soak. |
| 2 | `user_preferences,dns_lookup` | Read-mostly, low write rate. |
| 3 | `bookmarks,notes,code_snippets,api_client` | Core per-user; heavy use. |
| 4 | `tasks,passwords,url_shortener_owner` | Frequent writes — verify invalidation. |
| 5 | `url_shortener_resolve,analytics_aggregate` | XFetch namespaces — verify no stampede. |

Each phase: ≥24h soak. Kill switch = drop namespace from env + restart workers. Global kill = `CACHE_ENABLED=false`.

## 15. Open Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| XFetch `beta` mis-tuned per namespace | Expose `CACHE_XFETCH_BETA` env; default 1.0; revisit per ns after Phase 5 metrics. |
| Hot-key with very large payload (e.g. user with 100k bookmarks) | Pagination already bounds payload. Cache layer skips entries > 1MB (logs `cache.skip.toolarge`); falls through to Mongo. |
| Redis flush / data loss | Fail-open + INCR-returns-1 path handles it; cache rebuilds within TTL. |
| Version-key INCR overflow | int64 → millions of years at realistic rates. Non-issue. |
| Reliance on `APP_SECRET` for hash keying | Already required for JWT; rotation invalidates all cached arg-hashes — acceptable (TTL evicts stale entries). |

## 16. Out of Scope (explicit)

- Multi-region cache replication.
- Redis Cluster / sharding.
- Per-key encryption at rest (relies on Redis access control + TLS).
- Prometheus / Grafana dashboards.
- L1 in-process payload cache (only version-key has 5s in-proc LRU).
- Cache warming on deploy (cold-start acceptable; warms within minutes).

## 17. Relationship to Prior Plan

This spec subsumes the Redis-related portions of `2026-06-20-backend-scale-1000-concurrent.md`:

- Redis client lifecycle → `app.core.redis_client`.
- SlowAPI Redis storage → still in scope (Phase 1).
- Auth token cache → `auth_token` namespace.
- User profile cache → `auth_user` namespace.

That plan's non-Redis items (Gunicorn workers, MongoDB pool tuning, `find()` cap) remain independent and out of scope here.
