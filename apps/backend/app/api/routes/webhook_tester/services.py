"""Webhook Tester — short-lived request bins.

Storage: Redis with a 24h TTL when configured (matches the dominant
short-lived-data pattern, see app/core/redis_client.py). When Redis is
unavailable (dev/tests without REDIS_URL) an in-process fallback store with
the same TTL semantics is used.
"""
from __future__ import annotations

import base64
import json
import logging
import secrets
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any

from app.core.redis_client import get_redis

log = logging.getLogger("app.webhook_tester")

BIN_TTL_SECONDS = 24 * 60 * 60
MAX_REQUESTS_PER_BIN = 100
MAX_BODY_BYTES = 64 * 1024

# bin_id -> {"bin_id", "created_at", "expires_at", "requests": [newest, ...]}
_memory_bins: dict[str, dict[str, Any]] = {}


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _bin_key(bin_id: str) -> str:
    return f"webhook_tester:bin:{bin_id}"


def _req_key(bin_id: str) -> str:
    return f"webhook_tester:req:{bin_id}"


def new_bin_id() -> str:
    """Random URL-safe id (~11 chars) — unguessable capability id."""
    return secrets.token_urlsafe(8)


def _purge_memory() -> None:
    now_iso = _now().isoformat()
    expired = [bid for bid, entry in _memory_bins.items() if entry["expires_at"] <= now_iso]
    for bid in expired:
        _memory_bins.pop(bid, None)


def make_record(
    *,
    method: str,
    path: str,
    query: dict[str, str],
    headers: dict[str, str],
    body: bytes,
    content_type: str | None,
    source_ip: str | None,
) -> dict[str, Any]:
    """Build a stored request record; truncates large bodies, base64s binary ones."""
    size = len(body)
    truncated = False
    if size > MAX_BODY_BYTES:
        body = body[:MAX_BODY_BYTES]
        truncated = True
    try:
        text = body.decode("utf-8")
        encoding = "text"
    except UnicodeDecodeError:
        text = base64.b64encode(body).decode("ascii")
        encoding = "base64"
    return {
        "id": uuid.uuid4().hex[:12],
        "method": method.upper(),
        "path": path,
        "query": query,
        "headers": headers,
        "body": text,
        "body_encoding": encoding,
        "body_truncated": truncated,
        "content_type": content_type,
        "size": size,
        "source_ip": source_ip,
        "received_at": _now().isoformat(),
    }


async def create_bin() -> dict[str, Any]:
    created = _now()
    meta = {
        "bin_id": new_bin_id(),
        "created_at": created.isoformat(),
        "expires_at": (created + timedelta(seconds=BIN_TTL_SECONDS)).isoformat(),
    }
    r = get_redis()
    if r is not None:
        try:
            await r.set(_bin_key(meta["bin_id"]), json.dumps(meta), ex=BIN_TTL_SECONDS)
            return meta
        except Exception as exc:  # noqa: BLE001 — fail over to memory store
            log.warning("webhook_tester.redis.create failed err=%s", exc)
    _purge_memory()
    _memory_bins[meta["bin_id"]] = {**meta, "requests": []}
    return meta


async def get_bin(bin_id: str) -> dict[str, Any] | None:
    """Return bin metadata or None if unknown/expired."""
    r = get_redis()
    if r is not None:
        try:
            raw = await r.get(_bin_key(bin_id))
            if raw is not None:
                return json.loads(raw)
        except Exception as exc:  # noqa: BLE001
            log.warning("webhook_tester.redis.get_bin failed err=%s", exc)
    _purge_memory()
    entry = _memory_bins.get(bin_id)
    if entry is None:
        return None
    return {k: entry[k] for k in ("bin_id", "created_at", "expires_at")}


async def add_request(bin_id: str, record: dict[str, Any]) -> bool:
    """Store a request (newest first, capped). False if the bin is unknown/expired."""
    r = get_redis()
    if r is not None:
        try:
            ttl = await r.ttl(_bin_key(bin_id))
            if ttl is None or ttl <= 0:
                return False
            pipe = r.pipeline()
            pipe.lpush(_req_key(bin_id), json.dumps(record))
            pipe.ltrim(_req_key(bin_id), 0, MAX_REQUESTS_PER_BIN - 1)
            pipe.expire(_req_key(bin_id), ttl)
            await pipe.execute()
            return True
        except Exception as exc:  # noqa: BLE001
            log.warning("webhook_tester.redis.add failed err=%s", exc)
    _purge_memory()
    entry = _memory_bins.get(bin_id)
    if entry is None:
        return False
    entry["requests"].insert(0, record)
    del entry["requests"][MAX_REQUESTS_PER_BIN:]
    return True


def _parse_ts(value: str) -> datetime | None:
    try:
        dt = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except (ValueError, AttributeError):
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt


def filter_after(items: list[dict[str, Any]], after: str) -> list[dict[str, Any]]:
    """Return only entries newer than the cursor (request id or ISO timestamp).

    `items` is newest-first. Unknown cursors return everything (safe for polling).
    """
    newer: list[dict[str, Any]] = []
    for item in items:
        if item.get("id") == after:
            return newer
        newer.append(item)
    ts = _parse_ts(after)
    if ts is None:
        return items
    result = []
    for item in items:
        item_ts = _parse_ts(str(item.get("received_at", "")))
        if item_ts is not None and item_ts > ts:
            result.append(item)
    return result


async def list_requests(
    bin_id: str, after: str | None = None
) -> tuple[dict[str, Any], list[dict[str, Any]]] | None:
    """Return (bin meta, requests newest-first) or None if the bin is unknown/expired."""
    meta = await get_bin(bin_id)
    if meta is None:
        return None
    items: list[dict[str, Any]] | None = None
    r = get_redis()
    if r is not None:
        try:
            raw = await r.lrange(_req_key(bin_id), 0, MAX_REQUESTS_PER_BIN - 1)
            items = [json.loads(x) for x in raw]
        except Exception as exc:  # noqa: BLE001
            log.warning("webhook_tester.redis.list failed err=%s", exc)
    if items is None:
        entry = _memory_bins.get(bin_id)
        items = list(entry["requests"]) if entry else []
    if after:
        items = filter_after(items, after)
    return meta, items


async def clear_requests(bin_id: str) -> bool:
    """Delete all captured requests. False if the bin is unknown/expired."""
    meta = await get_bin(bin_id)
    if meta is None:
        return False
    r = get_redis()
    if r is not None:
        try:
            await r.delete(_req_key(bin_id))
            return True
        except Exception as exc:  # noqa: BLE001
            log.warning("webhook_tester.redis.clear failed err=%s", exc)
    entry = _memory_bins.get(bin_id)
    if entry is not None:
        entry["requests"] = []
    return True
