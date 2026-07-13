# ponytail: stateless tool — no per-user persistence, no workspace scoping needed
from fastapi import APIRouter, Query

from app.api.routes.whois import services as svc
from app.api.routes.whois.schema import WhoisResult

router = APIRouter(prefix="/whois", tags=["whois"])


@router.get("/lookup", response_model=WhoisResult, summary="RDAP/WHOIS lookup for a domain or IP address")
async def lookup(
    target: str = Query(..., min_length=1, max_length=300, description="Domain name or IP address to look up"),
) -> WhoisResult:
    return await svc.lookup_whois(target)
