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
