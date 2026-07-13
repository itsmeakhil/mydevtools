from __future__ import annotations

import ipaddress
import re
from typing import Any

import httpx
from fastapi import HTTPException

from app.api.routes.whois.schema import WhoisContact, WhoisResult
from app.core.cache import cached
from app.core.cache.keys import register_namespace

# Global cache: RDAP data is public and slow-moving. Registered here (not in
# keys.py) so the whois module stays self-contained.
register_namespace("whois", scope="global", default_ttl=3600)

RDAP_BASE_URL = "https://rdap.org"
_HTTP_TIMEOUT_S = 15.0

_DOMAIN_RE = re.compile(r"^(?:[a-zA-Z0-9](?:[a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$")

# RDAP eventAction -> normalized field
_EVENT_FIELD = {
    "registration": "created",
    "last changed": "updated",
    "last update": "updated",
    "expiration": "expires",
}


def sanitize_target(raw: str) -> tuple[str, str]:
    """Sanitize and classify a lookup target.

    Strips scheme/path/port noise, lowercases, and validates. Returns
    ``(target, kind)`` where kind is ``"domain"`` or ``"ip"``.
    Raises ``HTTPException(400)`` for anything that is neither.
    """
    target = raw.strip()
    target = re.sub(r"^[a-zA-Z][a-zA-Z0-9+.\-]*://", "", target)  # scheme
    target = target.split("/", 1)[0].split("?", 1)[0].split("#", 1)[0]  # path/query
    target = target.strip().strip(".").lower()
    if target.startswith("[") and target.endswith("]"):  # bracketed IPv6
        target = target[1:-1]

    if not target or len(target) > 253:
        raise HTTPException(status_code=400, detail="Invalid domain or IP address")

    try:
        ipaddress.ip_address(target)
        return target, "ip"
    except ValueError:
        pass

    # Not an IP — strip a :port suffix if present, then validate as a domain.
    host = target.rsplit(":", 1)[0] if re.search(r":\d+$", target) else target
    if _is_valid_domain(host):
        return host, "domain"

    raise HTTPException(status_code=400, detail="Invalid domain or IP address")


def _is_valid_domain(domain: str) -> bool:
    return bool(_DOMAIN_RE.match(domain)) and len(domain) <= 253


@cached(ns="whois", ttl=3600, scope="global")
async def fetch_rdap(*, kind: str, target: str) -> dict[str, Any] | None:
    """Fetch the raw RDAP document for a domain or IP.

    Pure function of (kind, target) — cached globally for 1h.
    Returns ``None`` when the registry has no record (RDAP 404).
    Raises ``HTTPException`` for upstream failures (not cached).
    """
    path = "domain" if kind == "domain" else "ip"
    url = f"{RDAP_BASE_URL}/{path}/{target}"
    try:
        async with httpx.AsyncClient(timeout=_HTTP_TIMEOUT_S, follow_redirects=True) as client:
            resp = await client.get(url, headers={"accept": "application/rdap+json, application/json"})
    except httpx.HTTPError:
        raise HTTPException(status_code=502, detail="RDAP lookup failed: upstream service unreachable")

    if resp.status_code == 404:
        return None
    if resp.status_code == 429:
        raise HTTPException(status_code=503, detail="RDAP service is rate limiting requests; try again shortly")
    if resp.status_code >= 400:
        raise HTTPException(status_code=502, detail=f"RDAP upstream error (HTTP {resp.status_code})")

    try:
        data = resp.json()
    except ValueError:
        raise HTTPException(status_code=502, detail="RDAP upstream returned an invalid response")
    if not isinstance(data, dict):
        raise HTTPException(status_code=502, detail="RDAP upstream returned an invalid response")
    return data


def _vcard_value(entity: dict[str, Any], key: str) -> str | None:
    """Extract a text value (fn, org, …) from an RDAP entity's vcardArray."""
    vcard = entity.get("vcardArray")
    if not isinstance(vcard, list) or len(vcard) < 2 or not isinstance(vcard[1], list):
        return None
    for item in vcard[1]:
        if isinstance(item, list) and len(item) >= 4 and item[0] == key:
            value = item[3]
            if isinstance(value, list):
                value = " ".join(str(v) for v in value if v)
            text = str(value).strip()
            if text:
                return text
    return None


def _collect_contacts(entities: Any, out: list[WhoisContact], depth: int = 0) -> None:
    if depth > 3 or not isinstance(entities, list):
        return
    for entity in entities:
        if not isinstance(entity, dict):
            continue
        roles = [str(r) for r in entity.get("roles", []) if r]
        name = _vcard_value(entity, "fn")
        org = _vcard_value(entity, "org")
        handle = entity.get("handle")
        handle = str(handle) if handle else None
        # Respect redaction: keep whatever the registry exposes; skip entries
        # that carry no usable information at all.
        if roles or name or org or handle:
            out.append(WhoisContact(roles=roles, name=name, organization=org, handle=handle))
        _collect_contacts(entity.get("entities"), out, depth + 1)


def _find_registrar(data: dict[str, Any]) -> str | None:
    for entity in data.get("entities") or []:
        if not isinstance(entity, dict):
            continue
        if "registrar" in (entity.get("roles") or []):
            return _vcard_value(entity, "fn") or _vcard_value(entity, "org") or entity.get("handle")
    return None


def _extract_events(data: dict[str, Any]) -> dict[str, str | None]:
    out: dict[str, str | None] = {"created": None, "updated": None, "expires": None}
    for event in data.get("events") or []:
        if not isinstance(event, dict):
            continue
        action = str(event.get("eventAction", "")).lower()
        field = _EVENT_FIELD.get(action)
        if field and event.get("eventDate") and out[field] is None:
            out[field] = str(event["eventDate"])
    return out


def normalize_rdap(target: str, kind: str, data: dict[str, Any]) -> WhoisResult:
    events = _extract_events(data)

    nameservers: list[str] = []
    for ns in data.get("nameservers") or []:
        if isinstance(ns, dict) and ns.get("ldhName"):
            name = str(ns["ldhName"]).rstrip(".").lower()
            if name and name not in nameservers:
                nameservers.append(name)

    contacts: list[WhoisContact] = []
    _collect_contacts(data.get("entities"), contacts)

    registrar = _find_registrar(data)
    if registrar is None and kind == "ip":
        # For IP networks, surface the network name/handle as the "registrar" line.
        registrar = data.get("name") or data.get("handle")
        registrar = str(registrar) if registrar else None

    return WhoisResult(
        target=target,
        type=kind,  # type: ignore[arg-type]
        registrar=registrar,
        status=[str(s) for s in data.get("status") or []],
        created=events["created"],
        updated=events["updated"],
        expires=events["expires"],
        nameservers=nameservers,
        contacts=contacts,
        raw=data,
    )


async def lookup_whois(raw_target: str) -> WhoisResult:
    target, kind = sanitize_target(raw_target)
    data = await fetch_rdap(kind=kind, target=target)
    if data is None:
        label = "domain" if kind == "domain" else "IP address"
        raise HTTPException(status_code=404, detail=f"No RDAP/WHOIS record found for this {label}")
    return normalize_rdap(target, kind, data)
