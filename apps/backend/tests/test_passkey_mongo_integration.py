"""Real-MongoDB tests for passkey helpers.

Skipped unless Docker is available. Validates the things the in-memory fake
can't:
  - `webauthn_user_handle` unique index actually rejects collisions
  - `get_or_create_webauthn_user_handle` is race-safe under concurrent writes
  - positional `$` operator updates the correct array element
  - `$pull` semantics match what production sees
"""

from __future__ import annotations

import asyncio

import pytest


def _docker_available() -> bool:
    try:
        import docker

        client = docker.from_env()
        client.ping()
        return True
    except Exception:  # noqa: BLE001
        return False


pytestmark = pytest.mark.skipif(not _docker_available(), reason="docker not available")


@pytest.fixture(scope="module")
def mongo_container():
    from testcontainers.mongodb import MongoDbContainer

    with MongoDbContainer("mongo:7") as c:
        yield c


@pytest.fixture
async def repo(mongo_container, monkeypatch):
    """Point users_repo.db_manager at a fresh Motor client + DB per test."""
    from motor.motor_asyncio import AsyncIOMotorClient

    url = mongo_container.get_connection_url()
    client = AsyncIOMotorClient(url)
    db = client["test_mdt"]

    # Wipe USERS before each test for isolation
    from app.utils.collection_name import USERS

    await db[USERS].drop()

    # Apply the same indexes production would
    await db[USERS].create_index("webauthn_user_handle", unique=True, sparse=True)
    await db[USERS].create_index("passkeys.credential_id", sparse=True)

    # Patch db_manager to use this DB
    class _Adapter:
        async def update_one(self, collection, query, payload, upsert=False, array_filters=None):
            return await db[collection].update_one(
                query, payload, upsert=upsert, array_filters=array_filters
            )

        async def find_one(self, collection, query, projection=None):
            return await db[collection].find_one(query, projection)

        async def insert_one(self, collection, document):
            return await db[collection].insert_one(document)

    adapter = _Adapter()
    monkeypatch.setattr("app.api.routes.auth.users_repo.db_manager", adapter)

    async def noop_bump(*args, **kwargs):
        return None

    monkeypatch.setattr("app.api.routes.auth.users_repo.bump_version", noop_bump)

    yield adapter, db

    client.close()


async def _seed(db, uid: str = "uid-1") -> None:
    from app.utils.collection_name import USERS

    await db[USERS].insert_one({"_id": uid, "email": f"{uid}@x.test"})


@pytest.mark.asyncio
async def test_handle_unique_index_rejects_collisions(repo) -> None:
    from app.utils.collection_name import USERS
    from pymongo.errors import DuplicateKeyError

    _adapter, db = repo
    await _seed(db, "uid-A")
    await _seed(db, "uid-B")

    await db[USERS].update_one({"_id": "uid-A"}, {"$set": {"webauthn_user_handle": "shared"}})

    with pytest.raises(DuplicateKeyError):
        await db[USERS].update_one({"_id": "uid-B"}, {"$set": {"webauthn_user_handle": "shared"}})


@pytest.mark.asyncio
async def test_get_or_create_handle_is_race_safe(repo) -> None:
    """Hammer the helper concurrently for one user; only the first writer wins."""
    from app.api.routes.auth import users_repo

    _adapter, db = repo
    await _seed(db, "uid-race")

    proposals = [f"handle-{i}" for i in range(50)]
    results = await asyncio.gather(
        *(users_repo.get_or_create_webauthn_user_handle("uid-race", h) for h in proposals)
    )

    # All callers must receive the same final value
    assert len(set(results)) == 1
    final = results[0]
    assert final in proposals

    # And the stored doc reflects the same value
    stored = await users_repo.find_user_by_user_handle(final)
    assert stored is not None and stored["_id"] == "uid-race"


@pytest.mark.asyncio
async def test_positional_update_only_touches_target_element(repo) -> None:
    from app.api.routes.auth import users_repo

    _adapter, db = repo
    await _seed(db)
    await users_repo.add_passkey("uid-1", {"credential_id": "c1", "device_name": "A", "sign_count": 0})
    await users_repo.add_passkey("uid-1", {"credential_id": "c2", "device_name": "B", "sign_count": 0})

    await users_repo.update_passkey_usage("uid-1", "c2", 9)
    await users_repo.rename_passkey("uid-1", "c2", "Renamed B")

    passkeys = await users_repo.list_passkeys("uid-1")
    by_id = {p["credential_id"]: p for p in passkeys}
    assert by_id["c1"]["device_name"] == "A"
    assert by_id["c1"]["sign_count"] == 0
    assert by_id["c2"]["device_name"] == "Renamed B"
    assert by_id["c2"]["sign_count"] == 9


@pytest.mark.asyncio
async def test_remove_passkey_pulls_only_matching_credential(repo) -> None:
    from app.api.routes.auth import users_repo

    _adapter, db = repo
    await _seed(db)
    await users_repo.add_passkey("uid-1", {"credential_id": "c1"})
    await users_repo.add_passkey("uid-1", {"credential_id": "c2"})
    await users_repo.add_passkey("uid-1", {"credential_id": "c3"})

    removed = await users_repo.remove_passkey("uid-1", "c2")
    assert removed == 1
    remaining = [p["credential_id"] for p in await users_repo.list_passkeys("uid-1")]
    assert remaining == ["c1", "c3"]


@pytest.mark.asyncio
async def test_find_by_credential_id_scans_array(repo) -> None:
    from app.api.routes.auth import users_repo

    _adapter, db = repo
    await _seed(db, "uid-A")
    await _seed(db, "uid-B")
    await users_repo.add_passkey("uid-A", {"credential_id": "cred-A1"})
    await users_repo.add_passkey("uid-A", {"credential_id": "cred-A2"})
    await users_repo.add_passkey("uid-B", {"credential_id": "cred-B1"})

    found = await users_repo.find_user_by_credential_id("cred-A2")
    assert found is not None and found["_id"] == "uid-A"

    found = await users_repo.find_user_by_credential_id("cred-B1")
    assert found is not None and found["_id"] == "uid-B"

    assert await users_repo.find_user_by_credential_id("missing") is None
