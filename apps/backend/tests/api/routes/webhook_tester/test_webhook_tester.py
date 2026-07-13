"""Webhook Tester route tests.

The router is not yet wired into app.api.router (the coordinator adds the
include line), so we mount it on the app here. REDIS_URL is unset in tests,
so the service's in-memory fallback store is exercised.
"""
from datetime import datetime, timedelta, timezone

import pytest
from fastapi.testclient import TestClient

from app.api.routes.webhook_tester import services as svc
from app.api.routes.webhook_tester.api import router as webhook_tester_router
from app.main import app

if not any(getattr(r, "path", "").startswith("/api/v1/webhook-tester") for r in app.routes):
    app.include_router(webhook_tester_router, prefix="/api/v1")

client = TestClient(app)

BASE = "/api/v1/webhook-tester"


@pytest.fixture(autouse=True)
def clean_store():
    svc._memory_bins.clear()
    yield
    svc._memory_bins.clear()


def _create_bin() -> dict:
    res = client.post(f"{BASE}/bins")
    assert res.status_code == 200
    return res.json()


def test_create_bin_shape_and_ttl() -> None:
    data = _create_bin()
    assert set(data) == {"bin_id", "created_at", "expires_at"}
    assert 8 <= len(data["bin_id"]) <= 16
    created = datetime.fromisoformat(data["created_at"])
    expires = datetime.fromisoformat(data["expires_at"])
    assert expires - created == timedelta(hours=24)


def test_bin_ids_are_unique() -> None:
    ids = {_create_bin()["bin_id"] for _ in range(5)}
    assert len(ids) == 5


def test_receive_records_request_details() -> None:
    bin_id = _create_bin()["bin_id"]
    res = client.post(
        f"{BASE}/in/{bin_id}?foo=bar&foo=baz&x=1",
        json={"hello": "world"},
        headers={"x-custom": "abc"},
    )
    assert res.status_code == 200
    assert res.json() == {"ok": True}

    listed = client.get(f"{BASE}/bins/{bin_id}/requests")
    assert listed.status_code == 200
    body = listed.json()
    assert body["bin_id"] == bin_id
    assert body["count"] == 1
    req = body["requests"][0]
    assert req["method"] == "POST"
    assert req["path"] == ""
    assert req["query"] == {"foo": "bar,baz", "x": "1"}
    assert req["headers"]["x-custom"] == "abc"
    assert req["body"] == '{"hello":"world"}'
    assert req["body_encoding"] == "text"
    assert req["body_truncated"] is False
    assert req["content_type"] == "application/json"
    assert req["size"] == len('{"hello":"world"}')
    assert req["id"]
    assert req["received_at"]


def test_receive_captures_path_suffix() -> None:
    bin_id = _create_bin()["bin_id"]
    res = client.put(f"{BASE}/in/{bin_id}/github/push/events", content=b"payload")
    assert res.status_code == 200
    req = client.get(f"{BASE}/bins/{bin_id}/requests").json()["requests"][0]
    assert req["method"] == "PUT"
    assert req["path"] == "github/push/events"
    assert req["body"] == "payload"


@pytest.mark.parametrize("method", ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"])
def test_receive_accepts_all_methods(method: str) -> None:
    bin_id = _create_bin()["bin_id"]
    res = client.request(method, f"{BASE}/in/{bin_id}")
    assert res.status_code == 200
    reqs = client.get(f"{BASE}/bins/{bin_id}/requests").json()["requests"]
    assert [r["method"] for r in reqs] == [method]


def test_receive_unknown_bin_404() -> None:
    assert client.post(f"{BASE}/in/does-not-exist").status_code == 404


def test_list_unknown_bin_404() -> None:
    assert client.get(f"{BASE}/bins/does-not-exist/requests").status_code == 404


def test_clear_unknown_bin_404() -> None:
    assert client.delete(f"{BASE}/bins/does-not-exist/requests").status_code == 404


def test_expired_bin_rejected() -> None:
    bin_id = _create_bin()["bin_id"]
    past = (datetime.now(timezone.utc) - timedelta(seconds=1)).isoformat()
    svc._memory_bins[bin_id]["expires_at"] = past
    assert client.post(f"{BASE}/in/{bin_id}").status_code == 404
    assert client.get(f"{BASE}/bins/{bin_id}/requests").status_code == 404


def test_newest_first_and_capped_at_100() -> None:
    bin_id = _create_bin()["bin_id"]
    for i in range(105):
        client.post(f"{BASE}/in/{bin_id}", content=f"n{i}".encode())
    body = client.get(f"{BASE}/bins/{bin_id}/requests").json()
    assert body["count"] == 100
    assert body["requests"][0]["body"] == "n104"
    assert body["requests"][-1]["body"] == "n5"  # oldest 5 dropped


def test_after_cursor_by_request_id() -> None:
    bin_id = _create_bin()["bin_id"]
    for i in range(3):
        client.post(f"{BASE}/in/{bin_id}", content=f"n{i}".encode())
    all_reqs = client.get(f"{BASE}/bins/{bin_id}/requests").json()["requests"]
    cursor = all_reqs[1]["id"]  # the middle (n1)
    newer = client.get(f"{BASE}/bins/{bin_id}/requests", params={"after": cursor}).json()
    assert newer["count"] == 1
    assert newer["requests"][0]["body"] == "n2"


def test_after_cursor_by_timestamp() -> None:
    bin_id = _create_bin()["bin_id"]
    client.post(f"{BASE}/in/{bin_id}", content=b"old")
    old = client.get(f"{BASE}/bins/{bin_id}/requests").json()["requests"][0]
    client.post(f"{BASE}/in/{bin_id}", content=b"new")
    newer = client.get(
        f"{BASE}/bins/{bin_id}/requests", params={"after": old["received_at"]}
    ).json()["requests"]
    assert [r["body"] for r in newer] == ["new"]


def test_after_unknown_cursor_returns_everything() -> None:
    bin_id = _create_bin()["bin_id"]
    client.post(f"{BASE}/in/{bin_id}", content=b"a")
    body = client.get(f"{BASE}/bins/{bin_id}/requests", params={"after": "bogus"}).json()
    assert body["count"] == 1


def test_binary_body_is_base64() -> None:
    bin_id = _create_bin()["bin_id"]
    client.post(f"{BASE}/in/{bin_id}", content=b"\xff\xfe\x00binary")
    req = client.get(f"{BASE}/bins/{bin_id}/requests").json()["requests"][0]
    assert req["body_encoding"] == "base64"
    import base64

    assert base64.b64decode(req["body"]) == b"\xff\xfe\x00binary"


def test_large_body_truncated_at_64kb() -> None:
    bin_id = _create_bin()["bin_id"]
    client.post(f"{BASE}/in/{bin_id}", content=b"a" * (svc.MAX_BODY_BYTES + 500))
    req = client.get(f"{BASE}/bins/{bin_id}/requests").json()["requests"][0]
    assert req["body_truncated"] is True
    assert len(req["body"]) == svc.MAX_BODY_BYTES
    assert req["size"] == svc.MAX_BODY_BYTES + 500


def test_clear_requests() -> None:
    bin_id = _create_bin()["bin_id"]
    client.post(f"{BASE}/in/{bin_id}", content=b"x")
    res = client.delete(f"{BASE}/bins/{bin_id}/requests")
    assert res.status_code == 204
    body = client.get(f"{BASE}/bins/{bin_id}/requests").json()
    assert body["count"] == 0
    # Bin itself still alive after clearing
    assert client.post(f"{BASE}/in/{bin_id}", content=b"y").status_code == 200


def test_source_ip_prefers_x_forwarded_for() -> None:
    bin_id = _create_bin()["bin_id"]
    client.post(f"{BASE}/in/{bin_id}", headers={"x-forwarded-for": "203.0.113.7, 10.0.0.1"})
    req = client.get(f"{BASE}/bins/{bin_id}/requests").json()["requests"][0]
    assert req["source_ip"] == "203.0.113.7"


def test_endpoints_do_not_require_auth() -> None:
    # No cookies / Authorization header anywhere in this file — reaching 200s
    # above already proves it, but assert explicitly for the receive endpoint.
    bin_id = _create_bin()["bin_id"]
    res = client.post(f"{BASE}/in/{bin_id}", json={"ping": 1})
    assert res.status_code == 200
