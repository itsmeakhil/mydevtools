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
