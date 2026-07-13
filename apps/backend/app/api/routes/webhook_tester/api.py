# ponytail: public capability-URL tool — no auth on any endpoint (same as
# dns_lookup). Bin ids are unguessable; the receive endpoint MUST stay open
# because external services (Stripe, GitHub, ...) call it directly.
from fastapi import APIRouter, HTTPException, Query, Request

from app.api.routes.webhook_tester import services as svc
from app.api.routes.webhook_tester.schema import BinOut, RequestListOut

router = APIRouter(prefix="/webhook-tester", tags=["webhook-tester"])

_ALL_METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"]


@router.post("/bins", response_model=BinOut, summary="Create a webhook bin (expires after 24h)")
async def create_bin() -> BinOut:
    return BinOut(**await svc.create_bin())


@router.api_route("/in/{bin_id}", methods=_ALL_METHODS, summary="Receive a webhook (public, any method)")
@router.api_route(
    "/in/{bin_id}/{path:path}",
    methods=_ALL_METHODS,
    summary="Receive a webhook with a path suffix (public, any method)",
)
async def receive(bin_id: str, request: Request, path: str = "") -> dict:
    body = await request.body()

    query: dict[str, str] = {}
    for key, value in request.query_params.multi_items():
        query[key] = f"{query[key]},{value}" if key in query else value

    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        source_ip: str | None = forwarded.split(",")[0].strip()
    else:
        source_ip = request.client.host if request.client else None

    record = svc.make_record(
        method=request.method,
        path=path,
        query=query,
        headers=dict(request.headers),
        body=body,
        content_type=request.headers.get("content-type"),
        source_ip=source_ip,
    )
    if not await svc.add_request(bin_id, record):
        raise HTTPException(status_code=404, detail="Bin not found or expired")
    return {"ok": True}


@router.get(
    "/bins/{bin_id}/requests",
    response_model=RequestListOut,
    summary="List captured requests (newest first)",
)
async def list_requests(
    bin_id: str,
    after: str | None = Query(default=None, description="Cursor: request id or ISO timestamp"),
) -> RequestListOut:
    result = await svc.list_requests(bin_id, after)
    if result is None:
        raise HTTPException(status_code=404, detail="Bin not found or expired")
    meta, items = result
    return RequestListOut(
        bin_id=bin_id,
        expires_at=meta["expires_at"],
        count=len(items),
        requests=items,
    )


@router.delete("/bins/{bin_id}/requests", status_code=204, summary="Clear captured requests")
async def clear_requests(bin_id: str) -> None:
    if not await svc.clear_requests(bin_id):
        raise HTTPException(status_code=404, detail="Bin not found or expired")
