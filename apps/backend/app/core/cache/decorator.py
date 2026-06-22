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

from app.core.cache.keys import (
    NAMESPACES,
    NamespaceSpec,
    args_hash as _args_hash,
    build_key,
    version_key,
)
from app.core.cache.serializer import dumps, loads
from app.core.cache.xfetch import should_refresh, unwrap_payload, wrap_payload

log = logging.getLogger("app.cache")


# ---------------------------------------------------------------------------
# Thin shims — patched by tests via monkeypatch.setattr("...decorator.<name>")
# ---------------------------------------------------------------------------

def is_namespace_enabled(ns: str) -> bool:  # pragma: no cover
    from app.core.cache.flags import is_namespace_enabled as _real
    return _real(ns)


def get_redis():  # pragma: no cover
    from app.core.redis_client import get_redis as _real
    return _real()


def _secret() -> bytes:
    try:
        from app.core.config import get_settings
        s = get_settings()
        return (s.JWT_SECRET_KEY or "default-cache-secret").encode("utf-8")
    except Exception:  # noqa: BLE001
        return b"default-cache-secret"


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

_DEFAULT_TIMEOUT_S: float = 0.05  # 50 ms fallback when settings unavailable


async def _safe(coro: Awaitable, *, op: str, ns: str) -> Any:
    try:
        from app.core.config import get_settings
        timeout = get_settings().CACHE_OP_TIMEOUT_MS / 1000
    except Exception:  # noqa: BLE001
        timeout = _DEFAULT_TIMEOUT_S
    try:
        return await asyncio.wait_for(coro, timeout=timeout)
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


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

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
                    try:
                        from app.core.config import get_settings as _gs
                        beta = _gs().CACHE_XFETCH_BETA
                    except Exception:  # noqa: BLE001
                        beta = 1.0
                    if should_refresh(
                        computed_at=computed_at,
                        ttl=eff_ttl,
                        delta=delta,
                        beta=beta,
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
