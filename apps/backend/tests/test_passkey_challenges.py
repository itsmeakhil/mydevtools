"""Unit tests for the WebAuthn challenge store.

ponytail: only the challenge plumbing has hand-written logic worth testing —
the WebAuthn crypto belongs to py-webauthn, the repo helpers belong to
db_manager. Endpoint-level register/login tests need a real authenticator
simulator (e.g. soft-webauthn) which is overkill for now; add when shipping
to prod requires it.
"""

from __future__ import annotations

import datetime as dt

import pytest

from app.api.routes.auth.passkey import challenges


class _FakeDb:
    """Minimal in-memory stand-in for `app.database.db_manager`."""

    def __init__(self) -> None:
        self.docs: dict[str, dict] = {}

    async def update_one(self, _collection, query, payload, upsert=False, array_filters=None):
        _id = query.get("_id")
        if _id is None:
            return None
        if _id not in self.docs:
            if not upsert:
                return None
            self.docs[_id] = {"_id": _id}
        target = self.docs[_id]
        for k, v in (payload.get("$set") or {}).items():
            target[k] = v
        return None

    async def find_one_and_update(self, _collection, query, update_query, return_document=False):
        _id = query.get("_id")
        if _id is None or _id not in self.docs:
            return None
        snapshot = dict(self.docs[_id])
        for k, v in (update_query.get("$set") or {}).items():
            self.docs[_id][k] = v
        return snapshot

    async def delete_one(self, _collection, query):
        _id = query.get("_id")
        if _id in self.docs:
            del self.docs[_id]


@pytest.fixture
def fake_db(monkeypatch):
    db = _FakeDb()
    monkeypatch.setattr("app.api.routes.auth.passkey.challenges.db_manager", db)
    return db


@pytest.mark.asyncio
async def test_put_then_pop_returns_stored_challenge(fake_db) -> None:
    await challenges.put("register", "uid-1", "challenge-bytes-b64")
    got = await challenges.pop("register", "uid-1")
    assert got == "challenge-bytes-b64"


@pytest.mark.asyncio
async def test_pop_is_one_shot(fake_db) -> None:
    await challenges.put("login", "challenge-key", "c")
    assert await challenges.pop("login", "challenge-key") == "c"
    # Second pop must miss — single-use enforced
    assert await challenges.pop("login", "challenge-key") is None


@pytest.mark.asyncio
async def test_pop_on_missing_key_returns_none(fake_db) -> None:
    assert await challenges.pop("register", "never-issued") is None


@pytest.mark.asyncio
async def test_put_overwrites_previous_challenge(fake_db) -> None:
    await challenges.put("register", "uid-2", "first")
    await challenges.put("register", "uid-2", "second")
    got = await challenges.pop("register", "uid-2")
    assert got == "second"


@pytest.mark.asyncio
async def test_register_and_login_keys_are_disjoint(fake_db) -> None:
    await challenges.put("register", "uid-3", "reg")
    await challenges.put("login", "uid-3", "log")
    assert await challenges.pop("register", "uid-3") == "reg"
    assert await challenges.pop("login", "uid-3") == "log"


@pytest.mark.asyncio
async def test_created_at_is_set_for_ttl_index(fake_db) -> None:
    await challenges.put("register", "uid-4", "x")
    stored = fake_db.docs["register:uid-4"]
    assert isinstance(stored.get("created_at"), dt.datetime)
    # MongoDB TTL needs a timezone-aware UTC datetime
    assert stored["created_at"].tzinfo is not None
