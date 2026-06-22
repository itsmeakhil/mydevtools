from __future__ import annotations

import asyncio
import datetime
import logging

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request

from app.core import audit
from app.core.auth_cookies import ACCESS_COOKIE_NAME
from app.database import db_manager
from app.api.routes.auth.tokens import try_decode_access_token_uid
from app.utils.collection_name import AUDIT_LOG
from app.utils.utils import create_timestamp, new_id

logger = logging.getLogger(__name__)

_SKIP_METHODS = {"GET", "HEAD", "OPTIONS"}
_TTL_DAYS = 90


def _extract_uid(request: Request) -> str | None:
    token = None
    auth = request.headers.get("authorization")
    if auth:
        scheme, _, value = auth.partition(" ")
        if scheme.lower() == "bearer" and value.strip():
            token = value.strip()
    if not token:
        cookie = request.cookies.get(ACCESS_COOKIE_NAME)
        if cookie and cookie.strip():
            token = cookie.strip()
    if not token:
        return None
    try:
        return try_decode_access_token_uid(token)
    except Exception:  # never let auth decode break auditing
        return None


def _client_ip(request: Request) -> str | None:
    fwd = request.headers.get("x-forwarded-for")
    if fwd:
        return fwd.split(",")[0].strip()
    return request.client.host if request.client else None


def _module_from_path(path: str) -> str | None:
    # /api/v1/<module>/...
    parts = [p for p in path.split("/") if p]
    if len(parts) >= 3 and parts[0] == "api" and parts[1] == "v1":
        return parts[2]
    return None


async def write_audit_event(doc: dict) -> None:
    try:
        await db_manager.insert_one(AUDIT_LOG, doc)
    except Exception as exc:  # swallow — auditing must never break requests
        logger.warning("audit write failed: %s", exc)


class AuditMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        path = request.url.path
        if request.method in _SKIP_METHODS or not path.startswith("/api/v1"):
            return await call_next(request)
        if path.startswith("/api/v1/health"):
            return await call_next(request)

        ctx = audit.AuditContext()
        token = audit._audit_ctx.set(ctx)
        started = create_timestamp()
        uid = _extract_uid(request)
        status_code = 500
        try:
            response = await call_next(request)
            status_code = response.status_code
            return response
        finally:
            try:
                latency = create_timestamp() - started
                module = ctx.module or _module_from_path(path)
                action = ctx.action or (f"{module}.{request.method.lower()}" if module else request.method.lower())
                ts = create_timestamp()
                doc = {
                    "_id": new_id(),
                    "uid": uid,
                    "action": action,
                    "module": module,
                    "entity_type": ctx.entity_type,
                    "entity_id": ctx.entity_id,
                    "method": request.method,
                    "path": path,
                    "status": status_code,
                    "outcome": "success" if status_code < 400 else "failure",
                    "changes": ctx.changes,
                    "summary": ctx.summary,
                    "ip": _client_ip(request),
                    "ua_raw": request.headers.get("user-agent"),
                    "device": audit.parse_user_agent(request.headers.get("user-agent")),
                    "latency_ms": latency,
                    "ts": ts,
                    "expireAt": datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(days=_TTL_DAYS),
                }
                asyncio.create_task(write_audit_event(doc))
            except Exception as exc:  # never propagate
                logger.warning("audit envelope build failed: %s", exc)
            finally:
                audit._audit_ctx.reset(token)
