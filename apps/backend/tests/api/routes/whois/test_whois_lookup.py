import asyncio

import httpx
import pytest
from fastapi import HTTPException

from app.api.routes.whois import services as svc

RDAP_DOMAIN = {
    "objectClassName": "domain",
    "ldhName": "EXAMPLE.COM",
    "status": ["client delete prohibited", "client transfer prohibited"],
    "events": [
        {"eventAction": "registration", "eventDate": "1995-08-14T04:00:00Z"},
        {"eventAction": "expiration", "eventDate": "2026-08-13T04:00:00Z"},
        {"eventAction": "last changed", "eventDate": "2025-08-14T07:01:44Z"},
        {"eventAction": "last update of RDAP database", "eventDate": "2026-01-01T00:00:00Z"},
    ],
    "entities": [
        {
            "objectClassName": "entity",
            "handle": "376",
            "roles": ["registrar"],
            "vcardArray": [
                "vcard",
                [
                    ["version", {}, "text", "4.0"],
                    ["fn", {}, "text", "RESERVED-Internet Assigned Numbers Authority"],
                ],
            ],
            "entities": [
                {
                    "objectClassName": "entity",
                    "handle": "ABUSE-1",
                    "roles": ["abuse"],
                    "vcardArray": ["vcard", [["version", {}, "text", "4.0"], ["fn", {}, "text", "Abuse Desk"]]],
                }
            ],
        },
        {
            "objectClassName": "entity",
            "roles": ["registrant"],
            "vcardArray": [
                "vcard",
                [
                    ["version", {}, "text", "4.0"],
                    ["fn", {}, "text", "REDACTED FOR PRIVACY"],
                    ["org", {}, "text", "Example Org"],
                ],
            ],
        },
    ],
    "nameservers": [
        {"ldhName": "A.IANA-SERVERS.NET."},
        {"ldhName": "B.IANA-SERVERS.NET"},
        {"ldhName": "a.iana-servers.net"},
    ],
}

RDAP_IP = {
    "objectClassName": "ip network",
    "handle": "NET-8-8-8-0-1",
    "name": "LVLT-GOGL-8-8-8",
    "startAddress": "8.8.8.0",
    "endAddress": "8.8.8.255",
    "status": ["active"],
    "events": [
        {"eventAction": "registration", "eventDate": "2014-03-14T00:00:00Z"},
        {"eventAction": "last changed", "eventDate": "2014-03-14T00:00:00Z"},
    ],
    "entities": [
        {
            "objectClassName": "entity",
            "handle": "GOGL",
            "roles": ["registrant"],
            "vcardArray": ["vcard", [["version", {}, "text", "4.0"], ["fn", {}, "text", "Google LLC"]]],
        }
    ],
}


# ---------------------------------------------------------------------------
# sanitize_target
# ---------------------------------------------------------------------------

def test_sanitize_target_plain_domain():
    assert svc.sanitize_target("example.com") == ("example.com", "domain")


def test_sanitize_target_strips_scheme_path_and_case():
    assert svc.sanitize_target("https://Example.COM/path?q=1#frag") == ("example.com", "domain")


def test_sanitize_target_strips_trailing_dot_and_port():
    assert svc.sanitize_target("example.com.") == ("example.com", "domain")
    assert svc.sanitize_target("example.com:8080") == ("example.com", "domain")


def test_sanitize_target_ipv4():
    assert svc.sanitize_target("8.8.8.8") == ("8.8.8.8", "ip")


def test_sanitize_target_ipv6():
    assert svc.sanitize_target("2001:4860:4860::8888") == ("2001:4860:4860::8888", "ip")
    assert svc.sanitize_target("[2001:4860:4860::8888]") == ("2001:4860:4860::8888", "ip")


@pytest.mark.parametrize("bad", ["", "   ", "not a domain", "no-tld", "-bad-.com", "a" * 300 + ".com"])
def test_sanitize_target_rejects_invalid(bad):
    with pytest.raises(HTTPException) as exc:
        svc.sanitize_target(bad)
    assert exc.value.status_code == 400


# ---------------------------------------------------------------------------
# lookup_whois normalization (fetch mocked)
# ---------------------------------------------------------------------------

def test_lookup_whois_normalizes_domain(monkeypatch):
    async def fake_fetch(*, kind, target):
        assert kind == "domain"
        assert target == "example.com"
        return RDAP_DOMAIN

    monkeypatch.setattr(svc, "fetch_rdap", fake_fetch)
    out = asyncio.run(svc.lookup_whois("https://Example.com/whatever"))

    assert out.target == "example.com"
    assert out.type == "domain"
    assert out.registrar == "RESERVED-Internet Assigned Numbers Authority"
    assert out.status == ["client delete prohibited", "client transfer prohibited"]
    assert out.created == "1995-08-14T04:00:00Z"
    assert out.updated == "2025-08-14T07:01:44Z"
    assert out.expires == "2026-08-13T04:00:00Z"
    # lowercased, trailing dot stripped, deduped
    assert out.nameservers == ["a.iana-servers.net", "b.iana-servers.net"]
    assert out.raw == RDAP_DOMAIN


def test_lookup_whois_contacts_include_nested_and_redacted(monkeypatch):
    async def fake_fetch(*, kind, target):
        return RDAP_DOMAIN

    monkeypatch.setattr(svc, "fetch_rdap", fake_fetch)
    out = asyncio.run(svc.lookup_whois("example.com"))

    by_role = {tuple(c.roles): c for c in out.contacts}
    registrar = by_role[("registrar",)]
    assert registrar.name == "RESERVED-Internet Assigned Numbers Authority"
    assert registrar.handle == "376"

    registrant = by_role[("registrant",)]
    assert registrant.name == "REDACTED FOR PRIVACY"  # kept as the registry exposed it
    assert registrant.organization == "Example Org"

    abuse = by_role[("abuse",)]  # nested inside the registrar entity
    assert abuse.name == "Abuse Desk"
    assert abuse.handle == "ABUSE-1"


def test_lookup_whois_ip(monkeypatch):
    async def fake_fetch(*, kind, target):
        assert kind == "ip"
        assert target == "8.8.8.8"
        return RDAP_IP

    monkeypatch.setattr(svc, "fetch_rdap", fake_fetch)
    out = asyncio.run(svc.lookup_whois("8.8.8.8"))

    assert out.type == "ip"
    assert out.registrar == "LVLT-GOGL-8-8-8"  # falls back to network name
    assert out.created == "2014-03-14T00:00:00Z"
    assert out.nameservers == []
    assert any(c.name == "Google LLC" for c in out.contacts)


def test_lookup_whois_unknown_domain_returns_404(monkeypatch):
    async def fake_fetch(*, kind, target):
        return None

    monkeypatch.setattr(svc, "fetch_rdap", fake_fetch)
    with pytest.raises(HTTPException) as exc:
        asyncio.run(svc.lookup_whois("definitely-not-registered-zzz.com"))
    assert exc.value.status_code == 404


def test_lookup_whois_invalid_target_short_circuits(monkeypatch):
    called = False

    async def fake_fetch(*, kind, target):
        nonlocal called
        called = True
        return RDAP_DOMAIN

    monkeypatch.setattr(svc, "fetch_rdap", fake_fetch)
    with pytest.raises(HTTPException) as exc:
        asyncio.run(svc.lookup_whois("!!not valid!!"))
    assert exc.value.status_code == 400
    assert called is False


# ---------------------------------------------------------------------------
# fetch_rdap (httpx mocked)
# ---------------------------------------------------------------------------

class _FakeResponse:
    def __init__(self, status_code=200, json_data=None):
        self.status_code = status_code
        self._json = json_data

    def json(self):
        if self._json is None:
            raise ValueError("no json")
        return self._json


class _FakeAsyncClient:
    init_kwargs = None
    last_url = None
    response = None
    error = None

    def __init__(self, **kwargs):
        _FakeAsyncClient.init_kwargs = kwargs

    async def __aenter__(self):
        return self

    async def __aexit__(self, *exc):
        return False

    async def get(self, url, **kwargs):
        _FakeAsyncClient.last_url = url
        if _FakeAsyncClient.error is not None:
            raise _FakeAsyncClient.error
        return _FakeAsyncClient.response


@pytest.fixture
def fake_http(monkeypatch):
    _FakeAsyncClient.init_kwargs = None
    _FakeAsyncClient.last_url = None
    _FakeAsyncClient.response = None
    _FakeAsyncClient.error = None
    monkeypatch.setattr(svc.httpx, "AsyncClient", _FakeAsyncClient)
    return _FakeAsyncClient


def test_fetch_rdap_domain_url_and_redirects(fake_http):
    fake_http.response = _FakeResponse(200, RDAP_DOMAIN)
    out = asyncio.run(svc.fetch_rdap(kind="domain", target="example.com"))
    assert out == RDAP_DOMAIN
    assert fake_http.last_url == "https://rdap.org/domain/example.com"
    assert fake_http.init_kwargs.get("follow_redirects") is True


def test_fetch_rdap_ip_url(fake_http):
    fake_http.response = _FakeResponse(200, RDAP_IP)
    out = asyncio.run(svc.fetch_rdap(kind="ip", target="8.8.8.8"))
    assert out == RDAP_IP
    assert fake_http.last_url == "https://rdap.org/ip/8.8.8.8"


def test_fetch_rdap_404_returns_none(fake_http):
    fake_http.response = _FakeResponse(404)
    assert asyncio.run(svc.fetch_rdap(kind="domain", target="nope.example")) is None


def test_fetch_rdap_upstream_error_maps_to_502(fake_http):
    fake_http.response = _FakeResponse(500)
    with pytest.raises(HTTPException) as exc:
        asyncio.run(svc.fetch_rdap(kind="domain", target="example.com"))
    assert exc.value.status_code == 502


def test_fetch_rdap_rate_limit_maps_to_503(fake_http):
    fake_http.response = _FakeResponse(429)
    with pytest.raises(HTTPException) as exc:
        asyncio.run(svc.fetch_rdap(kind="domain", target="example.com"))
    assert exc.value.status_code == 503


def test_fetch_rdap_network_error_maps_to_502(fake_http):
    fake_http.error = httpx.ConnectError("boom")
    with pytest.raises(HTTPException) as exc:
        asyncio.run(svc.fetch_rdap(kind="domain", target="example.com"))
    assert exc.value.status_code == 502


def test_fetch_rdap_invalid_json_maps_to_502(fake_http):
    fake_http.response = _FakeResponse(200, None)
    with pytest.raises(HTTPException) as exc:
        asyncio.run(svc.fetch_rdap(kind="domain", target="example.com"))
    assert exc.value.status_code == 502
