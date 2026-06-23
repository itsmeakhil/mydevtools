"""Buffered click writes: events RPUSHed to Redis, periodic flush bulk-writes to Mongo."""
from __future__ import annotations

import asyncio
import logging
from collections import Counter
from datetime import datetime, timedelta, timezone

import orjson
from pymongo import UpdateOne

from app.api.routes.url_shortener.schema import COLLECTION, CLICKS_COLLECTION
from app.core.redis_client import get_redis
from app.database import db_manager

log = logging.getLogger("app.url_shortener.click_queue")

_QUEUE_KEY = b"url_shortener:clicks:queue"
_FLUSH_INTERVAL_S = 5.0
_MAX_DRAIN = 500  # ponytail: cap per tick to bound Mongo bulk size; raise if traffic warrants
_CLICK_RETENTION_DAYS = 90


async def enqueue_click(event: dict) -> bool:
    """Push event to Redis; returns True if queued, False if Redis unavailable."""
    r = get_redis()
    if r is None:
        return False
    try:
        await r.rpush(_QUEUE_KEY, orjson.dumps(event))
        return True
    except Exception as exc:  # noqa: BLE001
        log.warning("click_queue.enqueue.failed err=%s", exc)
        return False


async def _drain_once() -> int:
    r = get_redis()
    if r is None:
        return 0
    # Atomic drain: LRANGE + LTRIM in pipeline.
    # ponytail: rare race window between LRANGE and LTRIM under concurrent RPUSH; events appended
    # during that gap stay queued for next tick. Acceptable; no events lost.
    pipe = r.pipeline()
    pipe.lrange(_QUEUE_KEY, 0, _MAX_DRAIN - 1)
    pipe.ltrim(_QUEUE_KEY, _MAX_DRAIN, -1)
    raw_events, _ = await pipe.execute()
    if not raw_events:
        return 0

    events = []
    for raw in raw_events:
        try:
            events.append(orjson.loads(raw))
        except Exception:  # noqa: BLE001
            continue
    if not events:
        return 0

    # Inject Mongo-native types per-event (BSON Date for TTL)
    expire_at = datetime.now(timezone.utc) + timedelta(days=_CLICK_RETENTION_DAYS)
    for e in events:
        e["expireAt"] = expire_at

    db = db_manager.get_db()
    try:
        await db[CLICKS_COLLECTION].insert_many(events, ordered=False)
    except Exception as exc:  # noqa: BLE001
        log.warning("click_queue.insert_many.failed err=%s n=%d", exc, len(events))

    counts: Counter[str] = Counter(e["code"] for e in events if "code" in e)
    if counts:
        ops = [UpdateOne({"_id": code}, {"$inc": {"clicks": n}}) for code, n in counts.items()]
        try:
            await db[COLLECTION].bulk_write(ops, ordered=False)
        except Exception as exc:  # noqa: BLE001
            log.warning("click_queue.bulk_inc.failed err=%s n=%d", exc, len(ops))

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
