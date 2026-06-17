import time
from collections import defaultdict

from fastapi import APIRouter, Depends, Query, Request

from app.api.routes.auth.services import get_current_uid
from app.api.routes.url_shortener import services as svc
from app.api.routes.url_shortener.schema import (
    ShortLinkCreate,
    ShortLinkOut,
    ShortLinkResolve,
    ShortLinkUpdate,
    LinkAnalytics,
)

router = APIRouter(prefix="/url-shortener", tags=["url-shortener"])

_click_rate: dict[str, list[float]] = defaultdict(list)
_CLICK_WINDOW = 60.0   # seconds
_CLICK_MAX = 5         # per IP per code per window


@router.post("", response_model=ShortLinkOut, summary="Create a short link")
async def create_link(
    body: ShortLinkCreate,
    uid: str = Depends(get_current_uid),
) -> ShortLinkOut:
    return await svc.create_link(uid, body)


@router.get("", response_model=list[ShortLinkOut], summary="List user's short links")
async def list_links(
    uid: str = Depends(get_current_uid),
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=100, ge=1, le=500),
) -> list[ShortLinkOut]:
    return await svc.list_links(uid, skip=skip, limit=limit)


@router.get("/resolve/{code}", response_model=ShortLinkResolve, summary="Resolve a short code (public)")
async def resolve_link(code: str) -> ShortLinkResolve:
    return await svc.resolve_link(code)


@router.post("/{code}/click", status_code=204, summary="Record a click (public)")
async def record_click(code: str, request: Request) -> None:
    ip = request.headers.get("x-forwarded-for", request.client.host if request.client else "unknown").split(",")[0].strip()
    key = f"{ip}:{code}"
    now = time.time()
    _click_rate[key] = [t for t in _click_rate[key] if now - t < _CLICK_WINDOW]
    if len(_click_rate[key]) >= _CLICK_MAX:
        return  # silently ignore, don't error
    _click_rate[key].append(now)
    ua = request.headers.get("user-agent", "")
    referrer = request.headers.get("referer", "")
    await svc.record_click(code, ua=ua, referrer=referrer)


@router.get("/{code}/analytics", response_model=LinkAnalytics, summary="Get click analytics for a link")
async def get_analytics(
    code: str,
    days: int = Query(default=30, ge=1, le=365),
    uid: str = Depends(get_current_uid),
) -> LinkAnalytics:
    return await svc.get_analytics(uid, code, days=days)


@router.patch("/{code}", response_model=ShortLinkOut, summary="Update title or active state")
async def update_link(
    code: str,
    body: ShortLinkUpdate,
    uid: str = Depends(get_current_uid),
) -> ShortLinkOut:
    return await svc.update_link(uid, code, body)


@router.delete("/{code}", status_code=204, summary="Delete a short link")
async def delete_link(
    code: str,
    uid: str = Depends(get_current_uid),
) -> None:
    await svc.delete_link(uid, code)
