from __future__ import annotations

import asyncio
import re
from typing import Any

import dns.asyncresolver
import dns.exception
import dns.rdatatype
import dns.resolver

from app.api.routes.dns_lookup.schema import DNSLookupResult, DNSRecord
from app.core.cache import cached

VALID_RECORD_TYPES = {"A", "AAAA", "MX", "TXT", "NS", "CNAME", "SOA", "CAA", "PTR"}
_DOMAIN_RE = re.compile(r"^(?:[a-zA-Z0-9](?:[a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$")


def _is_valid_domain(domain: str) -> bool:
    return bool(_DOMAIN_RE.match(domain)) and len(domain) <= 253


@cached(ns="dns_lookup", ttl=3600, scope="global")
async def lookup(*, host: str, record_type: str = "A") -> tuple[list[DNSRecord], str | None]:
    """Cached DNS lookup for a single record type.

    Pure function of (host, record_type) — safe to cache globally for 1h.
    """
    domain = host.strip().lower().rstrip(".")
    resolver = dns.asyncresolver.Resolver()
    resolver.timeout = 5
    resolver.lifetime = 10
    return await _resolve_type(resolver, domain, record_type)


async def _resolve_type(resolver: dns.asyncresolver.Resolver, domain: str, rtype: str) -> tuple[list[DNSRecord], str | None]:
    try:
        answers = await resolver.resolve(domain, rtype, raise_on_no_answer=False)
        if answers.rrset is None:
            return [], None
        ttl = answers.rrset.ttl
        records: list[DNSRecord] = []
        for rdata in answers.rrset:
            rec = _parse_rdata(rtype, rdata, ttl)
            if rec:
                records.append(rec)
        return records, None
    except dns.resolver.NXDOMAIN:
        return [], "NXDOMAIN: Domain does not exist"
    except dns.resolver.NoNameservers:
        return [], "No nameservers available"
    except dns.resolver.Timeout:
        return [], "Query timed out"
    except dns.exception.DNSException as exc:
        return [], str(exc)


def _parse_rdata(rtype: str, rdata: Any, ttl: int) -> DNSRecord | None:
    if rtype == "A":
        return DNSRecord(type=rtype, value=str(rdata.address), ttl=ttl)
    if rtype == "AAAA":
        return DNSRecord(type=rtype, value=str(rdata.address), ttl=ttl)
    if rtype == "MX":
        return DNSRecord(type=rtype, value=str(rdata.exchange).rstrip("."), ttl=ttl, priority=rdata.preference)
    if rtype == "TXT":
        value = " ".join(part.decode("utf-8", errors="replace") for part in rdata.strings)
        return DNSRecord(type=rtype, value=value, ttl=ttl)
    if rtype == "NS":
        return DNSRecord(type=rtype, value=str(rdata.target).rstrip("."), ttl=ttl)
    if rtype == "CNAME":
        return DNSRecord(type=rtype, value=str(rdata.target).rstrip("."), ttl=ttl)
    if rtype == "SOA":
        return DNSRecord(
            type=rtype,
            value=str(rdata.mname).rstrip("."),
            ttl=ttl,
            extra={
                "rname": str(rdata.rname).rstrip("."),
                "serial": rdata.serial,
                "refresh": rdata.refresh,
                "retry": rdata.retry,
                "expire": rdata.expire,
                "minimum": rdata.minimum,
            },
        )
    if rtype == "CAA":
        tag = rdata.tag.decode("utf-8", errors="replace") if isinstance(rdata.tag, bytes) else rdata.tag
        value = rdata.value.decode("utf-8", errors="replace") if isinstance(rdata.value, bytes) else rdata.value
        return DNSRecord(type=rtype, value=f'{rdata.flags} {tag} "{value}"', ttl=ttl)
    if rtype == "PTR":
        return DNSRecord(type=rtype, value=str(rdata.target).rstrip("."), ttl=ttl)
    return DNSRecord(type=rtype, value=str(rdata), ttl=ttl)


async def lookup_domain(domain: str, record_types: list[str]) -> DNSLookupResult:
    domain = domain.strip().lower().rstrip(".")
    if not _is_valid_domain(domain):
        return DNSLookupResult(domain=domain, records={}, errors={"_": "Invalid domain name"})

    requested = [rt.upper() for rt in record_types if rt.upper() in VALID_RECORD_TYPES]
    if not requested:
        requested = ["A", "AAAA", "MX", "TXT", "NS", "CNAME"]

    tasks = {rtype: lookup(host=domain, record_type=rtype) for rtype in requested}
    results = await asyncio.gather(*tasks.values())

    records: dict[str, list[DNSRecord]] = {}
    errors: dict[str, str] = {}
    for rtype, (recs, err) in zip(tasks.keys(), results):
        if err and rtype == requested[0] and "NXDOMAIN" in err:
            return DNSLookupResult(domain=domain, records={}, errors={"_": err})
        if err:
            errors[rtype] = err
        else:
            records[rtype] = recs

    return DNSLookupResult(domain=domain, records=records, errors=errors)
