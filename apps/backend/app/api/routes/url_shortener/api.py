from fastapi import APIRouter, Depends, Query

from app.api.routes.auth.services import get_current_uid
from app.api.routes.url_shortener import services as svc
from app.api.routes.url_shortener.schema import (
    ShortLinkCreate,
    ShortLinkOut,
    ShortLinkResolve,
    ShortLinkUpdate,
)

router = APIRouter(prefix="/url-shortener", tags=["url-shortener"])


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
async def record_click(code: str) -> None:
    await svc.record_click(code)


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
