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

    # Override the get_current_uid dependency so the fake is used
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
