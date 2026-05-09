from fastapi import APIRouter, Query

from app.api.routes.dns_lookup import services as svc
from app.api.routes.dns_lookup.schema import DNSLookupResult

router = APIRouter(prefix="/dns-lookup", tags=["dns-lookup"])


@router.get("/lookup", response_model=DNSLookupResult, summary="Perform DNS lookup for a domain")
async def lookup(
    domain: str = Query(..., description="Domain name to look up"),
    record_types: list[str] = Query(
        default=["A", "AAAA", "MX", "TXT", "NS", "CNAME"],
        description="DNS record types to query",
    ),
) -> DNSLookupResult:
    return await svc.lookup_domain(domain, record_types)
