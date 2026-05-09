from typing import Any
from pydantic import BaseModel


class DNSRecord(BaseModel):
    type: str
    value: str
    ttl: int | None = None
    priority: int | None = None
    extra: dict[str, Any] | None = None


class DNSLookupResult(BaseModel):
    domain: str
    records: dict[str, list[DNSRecord]]
    errors: dict[str, str] = {}
