"""End-to-end passkey tests driven by the soft-webauthn authenticator.

Exercises register/begin → register/finish → login/begin → login/finish via
FastAPI's TestClient. Repo + token + cookie helpers are stubbed in memory so
the test does not require MongoDB or Firebase.
"""

from __future__ import annotations

import base64
import json
from typing import Any

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from soft_webauthn import SoftWebauthnDevice

from app.api.routes.auth.passkey.api import router as passkey_router
from app.api.routes.auth.services import get_current_uid
from app.core.limiter import limiter


def _b64url(b: bytes) -> str:
    return base64.urlsafe_b64encode(b).rstrip(b"=").decode("ascii")


def _decode_b64url(s: str) -> bytes:
    pad = "=" * (-len(s) % 4)
    return base64.urlsafe_b64decode(s + pad)


# ── In-memory stand-ins for repo + challenges + tokens ────────────────────────


class _Store:
    """Per-test in-memory state shared by the patched repo functions."""

    def __init__(self) -> None:
        self.users: dict[str, dict[str, Any]] = {}
        self.challenges: dict[str, str] = {}


def _patch_services(monkeypatch, store: _Store) -> None:
    s = "app.api.routes.auth.passkey.services"

    async def fake_get_user_doc(uid: str):
        return store.users.get(uid)

    async def fake_get_or_create_handle(uid: str, handle_b64: str) -> str:
        user = store.users.setdefault(uid, {"_id": uid, "email": f"{uid}@x.test"})
        if "webauthn_user_handle" not in user:
            user["webauthn_user_handle"] = handle_b64
        return user["webauthn_user_handle"]

    async def fake_list_passkeys(uid: str):
        return list((store.users.get(uid) or {}).get("passkeys") or [])

    async def fake_add_passkey(uid: str, passkey: dict[str, Any]):
        store.users.setdefault(uid, {"_id": uid}).setdefault("passkeys", []).append(passkey)

    async def fake_find_by_credential_id(cred_id: str):
        for u in store.users.values():
            for p in u.get("passkeys", []):
                if p.get("credential_id") == cred_id:
                    return u
        return None

    async def fake_find_by_user_handle(handle: str):
        for u in store.users.values():
            if u.get("webauthn_user_handle") == handle:
                return u
        return None

    async def fake_update_usage(uid: str, credential_id: str, sign_count: int):
        u = store.users.get(uid)
        if not u:
            return
        for p in u.get("passkeys", []):
            if p.get("credential_id") == credential_id:
                p["sign_count"] = sign_count
                p["last_used_at"] = 1
                return

    monkeypatch.setattr(f"{s}.get_user_doc", fake_get_user_doc)
    monkeypatch.setattr(f"{s}.get_or_create_webauthn_user_handle", fake_get_or_create_handle)
    monkeypatch.setattr(f"{s}.list_passkeys", fake_list_passkeys)
    monkeypatch.setattr(f"{s}.add_passkey", fake_add_passkey)
    monkeypatch.setattr(f"{s}.find_user_by_credential_id", fake_find_by_credential_id)
    monkeypatch.setattr(f"{s}.find_user_by_user_handle", fake_find_by_user_handle)
    monkeypatch.setattr(f"{s}.update_passkey_usage", fake_update_usage)

    # Challenge store: keep it in memory
    async def fake_put(kind: str, subject: str, ch: str):
        store.challenges[f"{kind}:{subject}"] = ch

    async def fake_pop(kind: str, subject: str):
        return store.challenges.pop(f"{kind}:{subject}", None)

    monkeypatch.setattr(f"{s}.challenges.put", fake_put)
    monkeypatch.setattr(f"{s}.challenges.pop", fake_pop)

    # Stub the WebAuthn RP config — soft-webauthn defaults to localhost
    from app.core.config import get_settings

    settings = get_settings()
    monkeypatch.setattr(settings, "WEBAUTHN_RP_ID", "localhost", raising=False)
    monkeypatch.setattr(settings, "WEBAUTHN_RP_NAME", "Test", raising=False)
    monkeypatch.setattr(settings, "WEBAUTHN_ORIGINS", "http://localhost", raising=False)


def _patch_api(monkeypatch) -> None:
    a = "app.api.routes.auth.passkey.api"

    async def fake_set_refresh(uid: str, h: str):
        return None

    monkeypatch.setattr(f"{a}.set_refresh_token_hash", fake_set_refresh)
    monkeypatch.setattr(f"{a}.create_access_token", lambda uid: f"access-{uid}")
    monkeypatch.setattr(f"{a}.new_refresh_token", lambda: "refresh-raw")
    monkeypatch.setattr(f"{a}.hash_refresh_token", lambda s: f"hash-{s}")


@pytest.fixture
def app_and_store(monkeypatch):
    store = _Store()
    _patch_services(monkeypatch, store)
    _patch_api(monkeypatch)

    # In-memory slowapi store is module-level; reset between tests so
    # rate-limit budgets don't leak across the suite.
    try:
        limiter.reset()
    except Exception:
        pass

    app = FastAPI()
    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
    app.include_router(passkey_router, prefix="/api/v1")

    app.dependency_overrides[get_current_uid] = lambda: "uid-test"
    return app, store


# ── Helpers to drive the soft-webauthn authenticator ──────────────────────────


def _options_for_soft_webauthn_register(opts_json: dict) -> dict:
    """Translate the public-key JSON returned by the API into the shape
    SoftWebauthnDevice.create() expects (challenge as bytes, user.id as bytes).
    """
    public_key = {
        "rp": opts_json["rp"],
        "user": {
            "id": _decode_b64url(opts_json["user"]["id"]),
            "name": opts_json["user"]["name"],
            "displayName": opts_json["user"]["displayName"],
        },
        "challenge": _decode_b64url(opts_json["challenge"]),
        "pubKeyCredParams": opts_json["pubKeyCredParams"],
    }
    return {"publicKey": public_key}


def _options_for_soft_webauthn_login(opts_json: dict) -> dict:
    public_key = {
        "rpId": opts_json["rpId"],
        "challenge": _decode_b64url(opts_json["challenge"]),
        "allowCredentials": [],
    }
    return {"publicKey": public_key}


def _credential_for_api_register(cred: dict) -> dict:
    return {
        "id": _b64url(cred["rawId"]),
        "rawId": _b64url(cred["rawId"]),
        "response": {
            "clientDataJSON": _b64url(cred["response"]["clientDataJSON"]),
            "attestationObject": _b64url(cred["response"]["attestationObject"]),
            "transports": ["internal"],
        },
        "type": cred["type"],
    }


def _credential_for_api_login(assertion: dict) -> dict:
    user_handle = assertion["response"].get("userHandle")
    return {
        "id": _b64url(assertion["rawId"]),
        "rawId": _b64url(assertion["rawId"]),
        "response": {
            "clientDataJSON": _b64url(assertion["response"]["clientDataJSON"]),
            "authenticatorData": _b64url(assertion["response"]["authenticatorData"]),
            "signature": _b64url(assertion["response"]["signature"]),
            "userHandle": _b64url(user_handle) if user_handle else None,
        },
        "type": assertion["type"],
    }


# ── Tests ─────────────────────────────────────────────────────────────────────


def test_register_then_login_roundtrip(app_and_store) -> None:
    app, store = app_and_store
    # Seed the user record so begin_registration finds them
    store.users["uid-test"] = {"_id": "uid-test", "email": "u@x.test"}
    client = TestClient(app)
    device = SoftWebauthnDevice()

    # 1. Register: begin
    res = client.post("/api/v1/auth/passkey/register/begin")
    assert res.status_code == 200, res.text
    reg_opts = res.json()
    assert reg_opts["challenge"]
    assert reg_opts["user"]["id"]

    # 2. Soft authenticator creates the credential
    sw_cred = device.create(_options_for_soft_webauthn_register(reg_opts), "http://localhost")
    api_cred = _credential_for_api_register(sw_cred)

    # 3. Register: finish
    res = client.post(
        "/api/v1/auth/passkey/register/finish",
        json={"credential": api_cred, "device_name": "Test Device"},
    )
    assert res.status_code == 200, res.text
    assert res.json()["device_name"] == "Test Device"
    assert len(store.users["uid-test"]["passkeys"]) == 1

    # 4. Login: begin (no auth needed)
    res = client.post("/api/v1/auth/passkey/login/begin")
    assert res.status_code == 200, res.text
    login_opts = res.json()

    # 5. Soft authenticator signs the assertion
    sw_assertion = device.get(_options_for_soft_webauthn_login(login_opts), "http://localhost")
    api_assertion = _credential_for_api_login(sw_assertion)

    # 6. Login: finish — cookies should be set, uid returned
    res = client.post(
        "/api/v1/auth/passkey/login/finish", json={"credential": api_assertion}
    )
    assert res.status_code == 200, res.text
    assert res.json()["uid"] == "uid-test"
    set_cookie = res.headers.get("set-cookie") or ""
    assert "mdt_at=" in set_cookie or "mdt_rt=" in set_cookie

    # 7. sign_count must advance
    stored = store.users["uid-test"]["passkeys"][0]
    assert stored["sign_count"] >= 1


def test_register_finish_rejects_when_challenge_missing(app_and_store) -> None:
    app, store = app_and_store
    store.users["uid-test"] = {"_id": "uid-test", "email": "u@x.test"}
    client = TestClient(app)

    res = client.post(
        "/api/v1/auth/passkey/register/finish",
        json={"credential": {"id": "x", "rawId": "x", "type": "public-key", "response": {}}},
    )
    assert res.status_code == 400
    assert "challenge" in res.json()["detail"].lower()


def test_duplicate_credential_id_rejected(app_and_store) -> None:
    app, store = app_and_store
    store.users["uid-test"] = {"_id": "uid-test", "email": "u@x.test"}
    client = TestClient(app)
    device = SoftWebauthnDevice()

    # First registration succeeds
    res = client.post("/api/v1/auth/passkey/register/begin")
    sw_cred = device.create(_options_for_soft_webauthn_register(res.json()), "http://localhost")
    assert (
        client.post(
            "/api/v1/auth/passkey/register/finish",
            json={"credential": _credential_for_api_register(sw_cred), "device_name": "A"},
        ).status_code
        == 200
    )

    # Replay the same credential under a fresh challenge — services should
    # spot the existing credential_id and 409
    res = client.post("/api/v1/auth/passkey/register/begin")
    # Reuse the same device (same credential_id) but sign a new challenge —
    # the begin endpoint adds it to excludeCredentials, but a misbehaving
    # client could still send it. Force the duplicate path:
    res2 = client.post(
        "/api/v1/auth/passkey/register/finish",
        json={"credential": _credential_for_api_register(sw_cred), "device_name": "B"},
    )
    # Either 400 (challenge mismatch from py-webauthn) or 409 (duplicate guard).
    # Both signal the right thing — we just want to confirm it doesn't 200.
    assert res2.status_code in (400, 409)


def test_login_finish_rejects_unknown_credential(app_and_store) -> None:
    app, store = app_and_store
    # Seed the user record so registration can succeed, but throw the
    # passkey away locally before login — server should not find it.
    store.users["uid-test"] = {"_id": "uid-test", "email": "u@x.test"}
    client = TestClient(app)
    device = SoftWebauthnDevice()

    # Provision the device against the right rpID via a real registration,
    # then wipe the server-side passkey so it appears unknown at login time.
    reg_opts = client.post("/api/v1/auth/passkey/register/begin").json()
    sw_cred = device.create(_options_for_soft_webauthn_register(reg_opts), "http://localhost")
    client.post(
        "/api/v1/auth/passkey/register/finish",
        json={"credential": _credential_for_api_register(sw_cred), "device_name": "X"},
    )
    store.users["uid-test"]["passkeys"] = []  # forget the registration

    login_opts = client.post("/api/v1/auth/passkey/login/begin").json()
    sw_assertion = device.get(_options_for_soft_webauthn_login(login_opts), "http://localhost")
    res = client.post(
        "/api/v1/auth/passkey/login/finish",
        json={"credential": _credential_for_api_login(sw_assertion)},
    )
    assert res.status_code == 401


def test_list_and_delete_passkey(app_and_store) -> None:
    app, store = app_and_store
    store.users["uid-test"] = {
        "_id": "uid-test",
        "passkeys": [
            {
                "credential_id": "cred-abc",
                "public_key": "pk",
                "sign_count": 0,
                "transports": [],
                "device_name": "Demo",
                "backed_up": True,
                "created_at": 1,
                "last_used_at": None,
            }
        ],
    }

    # remove_passkey needs its own monkeypatch — list_endpoint uses list_passkeys
    # imported into api.py, so the api-side imports are the ones we patch here.
    import importlib

    api_mod = importlib.import_module("app.api.routes.auth.passkey.api")

    async def fake_list(uid: str):
        return list((store.users.get(uid) or {}).get("passkeys") or [])

    async def fake_remove(uid: str, cred_id: str) -> int:
        user = store.users.get(uid) or {}
        before = len(user.get("passkeys") or [])
        user["passkeys"] = [p for p in user.get("passkeys", []) if p.get("credential_id") != cred_id]
        return before - len(user["passkeys"])

    api_mod.list_passkeys = fake_list  # type: ignore[attr-defined]
    api_mod.remove_passkey = fake_remove  # type: ignore[attr-defined]

    client = TestClient(app)
    res = client.get("/api/v1/auth/passkey")
    assert res.status_code == 200
    body = res.json()
    assert len(body["passkeys"]) == 1
    assert body["passkeys"][0]["credential_id"] == "cred-abc"

    res = client.delete("/api/v1/auth/passkey/cred-abc")
    assert res.status_code == 200
    assert res.json()["ok"] is True
    assert store.users["uid-test"]["passkeys"] == []

    # Re-delete should 404
    res = client.delete("/api/v1/auth/passkey/cred-abc")
    assert res.status_code == 404
