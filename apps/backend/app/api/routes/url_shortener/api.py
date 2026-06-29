import logging

from fastapi import APIRouter, BackgroundTasks, Depends, Query, Request
from fastapi.responses import RedirectResponse

from app.api.routes.url_shortener import services as svc
from app.api.routes.url_shortener.schema import (
    ShortLinkCreate,
    ShortLinkOut,
    ShortLinkResolve,
    ShortLinkUpdate,
    LinkAnalytics,
)
from app.api.routes.workspaces.middleware import WorkspaceContext
from app.api.routes.workspaces.rbac import require_permission
from app.core.redis_client import get_redis

router = APIRouter(prefix="/url-shortener", tags=["url-shortener"])
log = logging.getLogger("app.url_shortener")

_CLICK_WINDOW = 60      # seconds
_CLICK_MAX = 5          # per IP per code per window


async def _is_click_rate_limited(ip: str, code: str) -> bool:
    r = get_redis()
    if r is None:
        return False  # ponytail: fail-open if Redis down
    key = f"rl:click:{ip}:{code}".encode()
    try:
        count = await r.incr(key)
        if count == 1:
            await r.expire(key, _CLICK_WINDOW)
        return count > _CLICK_MAX
    except Exception as exc:  # noqa: BLE001
        log.warning("click_rate.error err=%s", exc)
        return False


@router.post("", response_model=ShortLinkOut, summary="Create a short link")
async def create_link(
    body: ShortLinkCreate,
    ctx: WorkspaceContext = Depends(require_permission("url-shortener", "write")),
) -> ShortLinkOut:
    return await svc.create_link(ctx, body)


@router.get("", response_model=list[ShortLinkOut], summary="List user's short links")
async def list_links(
    ctx: WorkspaceContext = Depends(require_permission("url-shortener", "read")),
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=100, ge=1, le=500),
) -> list[ShortLinkOut]:
    return await svc.list_my_short_urls(ctx=ctx, skip=skip, limit=limit)


@router.get("/resolve/{code}", response_model=ShortLinkResolve, summary="Resolve a short code (public)")
async def resolve_link(code: str) -> ShortLinkResolve:
    return await svc.resolve_short_url(slug=code)


@router.get("/r/{code}", summary="Resolve + redirect + record click (public; one-hop)")
async def redirect_short(
    code: str,
    request: Request,
    background: BackgroundTasks,
) -> RedirectResponse:
    """Single-hop redirect: skips the Next.js round-trip. Reverse-proxy /s/* to this."""
    resolved = await svc.resolve_short_url(slug=code)
    if not resolved.active:
        target = "/link-disabled"
    else:
        target = resolved.original_url

    ip = request.headers.get(
        "x-forwarded-for",
        request.client.host if request.client else "unknown",
    ).split(",")[0].strip()

    if not await _is_click_rate_limited(ip, code):
        ua = request.headers.get("user-agent", "")
        referrer = request.headers.get("referer", "")
        background.add_task(svc.record_click, code, ua=ua, referrer=referrer)

    response = RedirectResponse(url=target, status_code=302)
    response.headers["Cache-Control"] = "public, max-age=60, s-maxage=300"
    return response


@router.post("/{code}/click", status_code=204, summary="Record a click (public)")
async def record_click(code: str, request: Request) -> None:
    ip = request.headers.get("x-forwarded-for", request.client.host if request.client else "unknown").split(",")[0].strip()
    if await _is_click_rate_limited(ip, code):
        return  # silently ignore, don't error
    ua = request.headers.get("user-agent", "")
    referrer = request.headers.get("referer", "")
    await svc.record_click(code, ua=ua, referrer=referrer)


@router.get("/{code}/analytics", response_model=LinkAnalytics, summary="Get click analytics for a link")
async def get_analytics(
    code: str,
    days: int = Query(default=30, ge=1, le=365),
    ctx: WorkspaceContext = Depends(require_permission("url-shortener", "read")),
) -> LinkAnalytics:
    return await svc.get_analytics(ctx=ctx, code=code, days=days)


@router.patch("/{code}", response_model=ShortLinkOut, summary="Update title or active state")
async def update_link(
    code: str,
    body: ShortLinkUpdate,
    ctx: WorkspaceContext = Depends(require_permission("url-shortener", "write")),
) -> ShortLinkOut:
    return await svc.update_link(ctx, code, body)


@router.delete("/{code}", status_code=204, summary="Delete a short link")
async def delete_link(
    code: str,
    ctx: WorkspaceContext = Depends(require_permission("url-shortener", "delete")),
) -> None:
    await svc.delete_link(ctx, code)
