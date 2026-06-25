"""Tests for the passkey helpers in users_repo against an in-memory fake of
db_manager that implements the Mongo update operators we actually use.

Why in-memory rather than mongomock: motor + mongomock-motor is brittle across
pymongo/motor versions, and the helpers exercise a small, well-defined slice
of Mongo's query language. The fake below implements just the operators the
production code touches ($set, $push, $pull, $exists, positional $) so we can
verify the helpers' intent without booting a real database.
"""

from __future__ import annotations

import copy
from collections.abc import Iterable
from typing import Any

import pytest


# ── A tiny Mongo-shaped fake ──────────────────────────────────────────────────


class _UpdateResult:
    def __init__(self, modified_count: int = 0) -> None:
        self.modified_count = modified_count


def _matches(doc: dict, query: dict) -> bool:
    for key, expected in query.items():
        # _id, plain fields
        if "." not in key:
            if isinstance(expected, dict) and "$exists" in expected:
                present = key in doc
                if bool(expected["$exists"]) != present:
                    return False
                continue
            if isinstance(expected, dict) and "$ne" in expected:
                if doc.get(key) == expected["$ne"]:
                    return False
                continue
            if doc.get(key) != expected:
                return False
            continue
        # Dotted, e.g. "passkeys.credential_id" — match if any element in the
        # array equals expected at the same sub-path.
        root, _, sub = key.partition(".")
        arr = doc.get(root) or []
        if not any(isinstance(item, dict) and item.get(sub) == expected for item in arr):
            return False
    return True


def _apply_update(doc: dict, query: dict, payload: dict) -> int:
    modified = 0
    # $set with positional operator support
    for op, ops in payload.items():
        if op == "$set":
            for k, v in ops.items():
                if ".$" in k:
                    root, _, rest = k.partition(".$.")
                    # Determine which element in `root` the original query targeted
                    target_field, target_value = None, None
                    for qk, qv in query.items():
                        if qk.startswith(f"{root}."):
                            target_field = qk.split(".", 1)[1]
                            target_value = qv
                            break
                    arr = doc.get(root) or []
                    for item in arr:
                        if isinstance(item, dict) and (
                            target_field is None or item.get(target_field) == target_value
                        ):
                            item[rest] = v
                            modified = 1
                            break
                else:
                    doc[k] = v
                    modified = max(modified, 1)
        elif op == "$push":
            for k, v in ops.items():
                doc.setdefault(k, []).append(v)
                modified = max(modified, 1)
        elif op == "$pull":
            for k, criterion in ops.items():
                before = list(doc.get(k) or [])
                if isinstance(criterion, dict):
                    doc[k] = [
                        item
                        for item in before
                        if not all(item.get(ck) == cv for ck, cv in criterion.items())
                    ]
                else:
                    doc[k] = [item for item in before if item != criterion]
                if len(doc[k]) != len(before):
                    modified = max(modified, 1)
        elif op == "$unset":
            for k in ops:
                if k in doc:
                    del doc[k]
                    modified = max(modified, 1)
    return modified


class _FakeDb:
    def __init__(self) -> None:
        self.docs: dict[str, dict[str, Any]] = {}

    async def update_one(self, _collection, query, payload, upsert=False, array_filters=None):
        for doc in self.docs.values():
            if _matches(doc, query):
                modified = _apply_update(doc, query, payload)
                return _UpdateResult(modified_count=modified)
        if upsert and "_id" in query:
            new_doc: dict[str, Any] = {"_id": query["_id"]}
            # $setOnInsert
            for k, v in (payload.get("$setOnInsert") or {}).items():
                new_doc[k] = copy.deepcopy(v)
            _apply_update(new_doc, query, payload)
            self.docs[query["_id"]] = new_doc
            return _UpdateResult(modified_count=0)
        return _UpdateResult(modified_count=0)

    async def find_one(self, _collection, query, projection=None):
        for doc in self.docs.values():
            if _matches(doc, query):
                if projection:
                    return {
                        k: v for k, v in doc.items() if k in projection or k == "_id"
                    }
                return copy.deepcopy(doc)
        return None

    async def count_documents(self, _collection, query):
        return sum(1 for d in self.docs.values() if _matches(d, query))


@pytest.fixture
def fake_db(monkeypatch):
    db = _FakeDb()
    monkeypatch.setattr("app.api.routes.auth.users_repo.db_manager", db)

    async def noop_bump(*args, **kwargs):
        return None

    monkeypatch.setattr("app.api.routes.auth.users_repo.bump_version", noop_bump)
    return db


# ── Tests ─────────────────────────────────────────────────────────────────────


async def _seed_user(db: _FakeDb, uid: str = "uid-1") -> None:
    db.docs[uid] = {"_id": uid, "email": "u@x.test"}


@pytest.mark.asyncio
async def test_get_or_create_handle_sets_on_first_call(fake_db) -> None:
    from app.api.routes.auth import users_repo

    await _seed_user(fake_db)
    got = await users_repo.get_or_create_webauthn_user_handle("uid-1", "handle-1")
    assert got == "handle-1"
    assert fake_db.docs["uid-1"]["webauthn_user_handle"] == "handle-1"


@pytest.mark.asyncio
async def test_get_or_create_handle_idempotent_second_call_keeps_first(fake_db) -> None:
    from app.api.routes.auth import users_repo

    await _seed_user(fake_db)
    first = await users_repo.get_or_create_webauthn_user_handle("uid-1", "handle-A")
    second = await users_repo.get_or_create_webauthn_user_handle("uid-1", "handle-B")
    assert first == "handle-A"
    assert second == "handle-A"  # the second proposed handle is rejected
    assert fake_db.docs["uid-1"]["webauthn_user_handle"] == "handle-A"


@pytest.mark.asyncio
async def test_add_and_list_passkeys(fake_db) -> None:
    from app.api.routes.auth import users_repo

    await _seed_user(fake_db)
    assert await users_repo.list_passkeys("uid-1") == []

    await users_repo.add_passkey("uid-1", {"credential_id": "c1", "device_name": "A"})
    await users_repo.add_passkey("uid-1", {"credential_id": "c2", "device_name": "B"})

    passkeys = await users_repo.list_passkeys("uid-1")
    assert [p["credential_id"] for p in passkeys] == ["c1", "c2"]


@pytest.mark.asyncio
async def test_remove_passkey_returns_count_and_pulls_matching(fake_db) -> None:
    from app.api.routes.auth import users_repo

    await _seed_user(fake_db)
    await users_repo.add_passkey("uid-1", {"credential_id": "c1", "device_name": "A"})
    await users_repo.add_passkey("uid-1", {"credential_id": "c2", "device_name": "B"})

    removed = await users_repo.remove_passkey("uid-1", "c1")
    assert removed == 1
    remaining = await users_repo.list_passkeys("uid-1")
    assert [p["credential_id"] for p in remaining] == ["c2"]


@pytest.mark.asyncio
async def test_remove_passkey_missing_returns_zero(fake_db) -> None:
    from app.api.routes.auth import users_repo

    await _seed_user(fake_db)
    await users_repo.add_passkey("uid-1", {"credential_id": "c1"})
    removed = await users_repo.remove_passkey("uid-1", "does-not-exist")
    assert removed == 0
    # Did not collateral-pull the existing one
    assert len(await users_repo.list_passkeys("uid-1")) == 1


@pytest.mark.asyncio
async def test_rename_passkey_updates_only_matching_element(fake_db) -> None:
    from app.api.routes.auth import users_repo

    await _seed_user(fake_db)
    await users_repo.add_passkey("uid-1", {"credential_id": "c1", "device_name": "Old A"})
    await users_repo.add_passkey("uid-1", {"credential_id": "c2", "device_name": "Old B"})

    modified = await users_repo.rename_passkey("uid-1", "c2", "New B")
    assert modified == 1
    names = {p["credential_id"]: p["device_name"] for p in await users_repo.list_passkeys("uid-1")}
    assert names == {"c1": "Old A", "c2": "New B"}


@pytest.mark.asyncio
async def test_rename_passkey_missing_returns_zero(fake_db) -> None:
    from app.api.routes.auth import users_repo

    await _seed_user(fake_db)
    await users_repo.add_passkey("uid-1", {"credential_id": "c1", "device_name": "Old"})
    modified = await users_repo.rename_passkey("uid-1", "ghost", "Whatever")
    assert modified == 0


@pytest.mark.asyncio
async def test_update_passkey_usage_bumps_sign_count_and_last_used(fake_db) -> None:
    from app.api.routes.auth import users_repo

    await _seed_user(fake_db)
    await users_repo.add_passkey(
        "uid-1", {"credential_id": "c1", "sign_count": 0, "last_used_at": None}
    )

    await users_repo.update_passkey_usage("uid-1", "c1", 7)

    passkeys = await users_repo.list_passkeys("uid-1")
    assert passkeys[0]["sign_count"] == 7
    assert isinstance(passkeys[0]["last_used_at"], int)
    assert passkeys[0]["last_used_at"] > 0


@pytest.mark.asyncio
async def test_find_user_by_user_handle(fake_db) -> None:
    from app.api.routes.auth import users_repo

    await _seed_user(fake_db, "uid-A")
    await _seed_user(fake_db, "uid-B")
    await users_repo.get_or_create_webauthn_user_handle("uid-A", "handle-A")
    await users_repo.get_or_create_webauthn_user_handle("uid-B", "handle-B")

    found = await users_repo.find_user_by_user_handle("handle-B")
    assert found is not None
    assert found["_id"] == "uid-B"
    assert await users_repo.find_user_by_user_handle("nope") is None


@pytest.mark.asyncio
async def test_find_user_by_credential_id(fake_db) -> None:
    from app.api.routes.auth import users_repo

    await _seed_user(fake_db, "uid-A")
    await _seed_user(fake_db, "uid-B")
    await users_repo.add_passkey("uid-A", {"credential_id": "cred-A1"})
    await users_repo.add_passkey("uid-B", {"credential_id": "cred-B1"})

    found = await users_repo.find_user_by_credential_id("cred-B1")
    assert found is not None
    assert found["_id"] == "uid-B"
    assert await users_repo.find_user_by_credential_id("missing") is None
