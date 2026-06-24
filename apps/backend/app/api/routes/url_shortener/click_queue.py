"""Buffered click writes: events RPUSHed to Redis, periodic flush bulk-writes to Mongo."""
from __future__ import annotations

import asyncio
import logging
from collections import Counter
from datetime import datetime, timedelta, timezone
from typing import Optional
from uuid import uuid4

import orjson
from pymongo import UpdateOne
from pymongo.errors import BulkWriteError
from redis.asyncio import Redis

from app.api.routes.url_shortener.schema import COLLECTION, CLICKS_COLLECTION
from app.core.config import get_settings
from app.core.redis_client import get_redis
from app.database import db_manager

log = logging.getLogger("app.url_shortener.click_queue")

_QUEUE_KEY = b"url_shortener:clicks:queue"
_FLUSH_INTERVAL_S = 5.0
_MAX_DRAIN = 500  # ponytail: cap per tick to bound Mongo bulk size; raise if traffic warrants
_CLICK_RETENTION_DAYS = 90
_FLUSH_SOCKET_TIMEOUT_S = 2.0  # generous timeout for pipeline ops; cache layer keeps its own tight one

_flush_client: Optional[Redis] = None


def _get_flush_client() -> Optional[Redis]:
    """Dedicated client for the click queue. Longer socket_timeout than the cache client."""
    global _flush_client
    if _flush_client is not None:
        return _flush_client
    settings = get_settings()
    if settings.REDIS_URL is None:
        return None
    _flush_client = Redis.from_url(
        settings.REDIS_URL,
        encoding="utf-8",
        decode_responses=False,
        socket_timeout=_FLUSH_SOCKET_TIMEOUT_S,
        socket_connect_timeout=2.0,
        health_check_interval=30,
    )
    return _flush_client


async def close_flush_client() -> None:
    global _flush_client
    if _flush_client is not None:
        try:
            await _flush_client.aclose()
        except Exception as exc:  # noqa: BLE001
            log.warning("click_queue.flush_client.close.failed err=%s", exc)
        _flush_client = None


async def enqueue_click(event: dict) -> bool:
    """Push event to Redis; returns True if queued, False if Redis unavailable."""
    r = get_redis()
    if r is None:
        return False
    # _id stamped here so retries after a partial flush dedupe on insert_many
    event.setdefault("_id", uuid4().hex)
    try:
        await r.rpush(_QUEUE_KEY, orjson.dumps(event))
        return True
    except Exception as exc:  # noqa: BLE001
        log.warning("click_queue.enqueue.failed err=%s", exc)
        return False


async def _drain_once() -> int:
    """Peek-ack drain: LRANGE → Mongo write → LTRIM. Idempotent on retry via event _id."""
    r = _get_flush_client()
    if r is None:
        return 0
    raw_events = await r.lrange(_QUEUE_KEY, 0, _MAX_DRAIN - 1)
    if not raw_events:
        return 0

    events: list[dict] = []
    for raw in raw_events:
        try:
            events.append(orjson.loads(raw))
        except Exception:  # noqa: BLE001
            continue
    if not events:
        # Bad payloads — ack so we don't loop forever
        await r.ltrim(_QUEUE_KEY, len(raw_events), -1)
        return 0

    expire_at = datetime.now(timezone.utc) + timedelta(days=_CLICK_RETENTION_DAYS)
    for e in events:
        e["expireAt"] = expire_at

    db = db_manager.get_db()

    # Insert clicks. Dup _id (11000) → already inserted on prior tick; skip in the inc step below.
    dup_indexes: set[int] = set()
    try:
        await db[CLICKS_COLLECTION].insert_many(events, ordered=False)
    except BulkWriteError as bwe:
        write_errors = bwe.details.get("writeErrors", []) if bwe.details else []
        dup_indexes = {we["index"] for we in write_errors if we.get("code") == 11000}
        other_errors = [we for we in write_errors if we.get("code") != 11000]
        if other_errors:
            log.warning(
                "click_queue.insert_many.partial dup=%d other=%d sample=%s",
                len(dup_indexes), len(other_errors), other_errors[:1],
            )
            # Real failures (not just dups) → don't ack; next tick retries the batch
            return 0
    except Exception as exc:  # noqa: BLE001
        log.warning("click_queue.insert_many.failed err=%s n=%d", exc, len(events))
        return 0

    # Increment counters only for newly-inserted events to avoid double-counting on retry
    new_events = [e for i, e in enumerate(events) if i not in dup_indexes]
    counts: Counter[str] = Counter(e["code"] for e in new_events if "code" in e)
    if counts:
        ops = [UpdateOne({"_id": code}, {"$inc": {"clicks": n}}) for code, n in counts.items()]
        try:
            await db[COLLECTION].bulk_write(ops, ordered=False)
        except Exception as exc:  # noqa: BLE001
            # Counters are denormalized; events already written. Log and ack to avoid re-double-count loop.
            log.warning("click_queue.bulk_inc.failed err=%s n=%d", exc, len(ops))

    # Ack: trim the exact range we read. New events arriving after LRANGE stay queued.
    try:
        await r.ltrim(_QUEUE_KEY, len(raw_events), -1)
    except Exception as exc:  # noqa: BLE001
        # ponytail: ltrim failed after Mongo write succeeded; next tick will re-insert (dup-key no-op)
        # and re-inc only newly-inserted (zero), so no double-count.
        log.warning("click_queue.ltrim.failed err=%s n=%d", exc, len(raw_events))

    return len(events)


async def flush_loop() -> None:
    log.info("click_queue.flush_loop.start interval=%ss", _FLUSH_INTERVAL_S)
    while True:
        try:
            await asyncio.sleep(_FLUSH_INTERVAL_S)
            n = await _drain_once()
            if n:
                log.info("click_queue.flushed n=%d", n)
        except asyncio.CancelledError:
            # Final drain on shutdown — don't lose buffered events
            try:
                while await _drain_once():
                    pass
            except Exception:  # noqa: BLE001
                pass
            raise
        except Exception as exc:  # noqa: BLE001
            log.warning("click_queue.flush.tick.failed err=%s", exc)
