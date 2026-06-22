import pytest
from fastapi import Depends, FastAPI
from fastapi.testclient import TestClient

from app.api.routes.auth.services import get_current_user, get_current_uid
from app.api.routes.auth.schema import UserProfileResponse


@pytest.fixture
def app_with_double_dep(monkeypatch):
    """FastAPI app whose endpoint asks for get_current_user twice.

    Patches the Mongo lookup with a counter so we can assert it ran once.
    """
    calls = {"n": 0}

    async def fake_get_user_doc(uid: str):
        calls["n"] += 1
        return {
            "_id": uid,
            "email": "u@example.com",
            "display_name": "U",
            "photo_url": None,
            "email_verified": True,
            "disabled": False,
        }

    def fake_get_current_uid() -> str:
        return "uid-abc"

    monkeypatch.setattr(
        "app.api.routes.auth.services.get_user_doc",
        fake_get_user_doc,
    )

    app = FastAPI()

    # Override via FastAPI dependency_overrides rather than monkeypatching the module name,
    # so the dep graph through Depends() is preserved.
    app.dependency_overrides[get_current_uid] = fake_get_current_uid

    @app.get("/twice")
    async def twice(
        a: UserProfileResponse = Depends(get_current_user),
        b: UserProfileResponse = Depends(get_current_user),
    ) -> dict:
        return {"a_uid": a.uid, "b_uid": b.uid, "calls": calls["n"]}

    return app, calls


def test_get_current_user_memoized_per_request(app_with_double_dep) -> None:
    app, calls = app_with_double_dep
    client = TestClient(app)
    res = client.get("/twice")
    assert res.status_code == 200
    body = res.json()
    assert body["a_uid"] == body["b_uid"] == "uid-abc"
    assert calls["n"] == 1, "Mongo lookup must run once per request"


def test_get_current_user_fresh_each_new_request(app_with_double_dep) -> None:
    app, calls = app_with_double_dep
    client = TestClient(app)
    client.get("/twice")
    client.get("/twice")
    # Two requests × one lookup each
    assert calls["n"] == 2


@pytest.fixture
def app_with_stale_cache(monkeypatch):
    """FastAPI app that pre-seeds a stale cached doc with mismatched uid.

    Tests that the cache guard correctly rejects a doc with a different _id
    and fetches fresh from Mongo.
    """
    calls = {"n": 0}

    async def fake_get_user_doc(uid: str):
        calls["n"] += 1
        return {
            "_id": uid,
            "email": "u@example.com",
            "display_name": "U",
            "photo_url": None,
            "email_verified": True,
            "disabled": False,
        }

    def fake_get_current_uid() -> str:
        return "uid-abc"

    monkeypatch.setattr(
        "app.api.routes.auth.services.get_user_doc",
        fake_get_user_doc,
    )

    app = FastAPI()

    # Override via FastAPI dependency_overrides rather than monkeypatching the module name,
    # so the dep graph through Depends() is preserved.
    app.dependency_overrides[get_current_uid] = fake_get_current_uid

    @app.middleware("http")
    async def inject_stale_cache(request, call_next):
        """Pre-seed request.state with a cached doc from a different uid."""
        request.state.current_user_doc = {
            "_id": "other-uid",
            "email": "other@example.com",
            "display_name": "Other",
            "photo_url": None,
            "email_verified": True,
            "disabled": False,
        }
        response = await call_next(request)
        return response

    @app.get("/twice")
    async def twice(
        a: UserProfileResponse = Depends(get_current_user),
        b: UserProfileResponse = Depends(get_current_user),
    ) -> dict:
        return {"a_uid": a.uid, "b_uid": b.uid, "calls": calls["n"]}

    return app, calls


def test_get_current_user_cache_bypassed_on_uid_mismatch(app_with_stale_cache) -> None:
    app, calls = app_with_stale_cache
    client = TestClient(app)
    res = client.get("/twice")
    assert res.status_code == 200
    body = res.json()
    # Should fetch fresh and return the correct uid, not "other-uid"
    assert body["a_uid"] == body["b_uid"] == "uid-abc"
    # Should have fetched fresh once (not used stale cache)
    assert calls["n"] == 1, "Cache must be bypassed when _id doesn't match uid"
