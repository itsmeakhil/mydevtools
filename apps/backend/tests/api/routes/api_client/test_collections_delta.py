"""Tests for POST /api-client/collections/{id}/items:apply-delta.

Auth pattern: override get_current_uid via FastAPI dependency_overrides
(same pattern used in test_auth_memo.py).  MongoDB is monkeypatched in-process
so no real DB is needed.
"""
from __future__ import annotations

import copy
from typing import Any
from unittest.mock import AsyncMock, MagicMock

import pytest
from bson import ObjectId
from httpx import ASGITransport, AsyncClient

from app.api.routes.auth.services import get_current_uid
from app.main import app

# Fixed IDs used throughout
OWNER_UID = "test-owner-uid"
OTHER_UID = "other-uid"
COLLECTION_OID = ObjectId()
COLLECTION_ID = str(COLLECTION_OID)

FOLDER_ID = "folder-1"
REQUEST_ID = "request-1"

BASE_COLLECTION: dict[str, Any] = {
    "_id": COLLECTION_OID,
    "created_by": OWNER_UID,
    "name": "My Collection",
    "items": [
        {
            "id": FOLDER_ID,
            "name": "Folder 1",
            "type": "folder",
            "items": [
                {
                    "id": REQUEST_ID,
                    "name": "Existing Request",
                    "type": "request",
                    "method": "GET",
                    "url": "https://existing",
                    "params": [],
                    "headers": [],
                    "body": {"type": "none", "content": "", "formData": [], "urlEncoded": []},
                    "auth": {"type": "none"},
                }
            ],
            "isOpen": True,
        }
    ],
}


def _make_client(uid: str) -> AsyncClient:
    """Return an AsyncClient that authenticates as uid."""
    app.dependency_overrides[get_current_uid] = lambda: uid
    return AsyncClient(transport=ASGITransport(app=app), base_url="http://test")


def _mock_find_one(collection_doc: dict | None):
    """Monkeypatch db_manager.find_one to return collection_doc."""
    async def _find_one(collection_name, query, projection=None):
        if collection_doc is None:
            return None
        # Honour ownership filter
        if query.get("created_by") != collection_doc.get("created_by"):
            return None
        return copy.deepcopy(collection_doc)

    return _find_one


def _mock_find_one_and_update(updated_doc: dict | None):
    """Monkeypatch db_manager.find_one_and_update to return updated_doc.

    The inner function stores the most-recent ``update_query`` on itself so
    tests can inspect the ``$set`` payload without resorting to AsyncMock.
    """
    async def _find_one_and_update(collection_name, query, update_query, return_document=False):
        _find_one_and_update.last_update_query = update_query  # type: ignore[attr-defined]
        if updated_doc is None:
            return None
        return copy.deepcopy(updated_doc)

    _find_one_and_update.last_update_query = None  # type: ignore[attr-defined]
    return _find_one_and_update


@pytest.fixture(autouse=True)
def cleanup_overrides():
    yield
    app.dependency_overrides.pop(get_current_uid, None)


# ── Test: add op inserts a new item under parent_id ──────────────────────────

@pytest.mark.asyncio
async def test_apply_delta_adds_item(monkeypatch):
    new_item = {
        "id": "new-req-1",
        "name": "New Request",
        "type": "request",
        "method": "POST",
        "url": "https://new",
        "params": [],
        "headers": [],
        "body": {"type": "none", "content": "", "formData": [], "urlEncoded": []},
        "auth": {"type": "none"},
    }

    # After the update, the collection has the new item under the folder
    updated_collection = copy.deepcopy(BASE_COLLECTION)
    updated_collection["items"][0]["items"].append(new_item)

    mock_update = _mock_find_one_and_update(updated_collection)
    monkeypatch.setattr("app.api.routes.api_client.collections_delta.db_manager.find_one", _mock_find_one(BASE_COLLECTION))
    monkeypatch.setattr(
        "app.api.routes.api_client.collections_delta.db_manager.find_one_and_update",
        mock_update,
    )
    monkeypatch.setattr("app.api.routes.api_client.collections_delta.bump_version", AsyncMock())

    async with _make_client(OWNER_UID) as ac:
        resp = await ac.post(
            f"/api/v1/api-client/collections/{COLLECTION_ID}/items:apply-delta",
            json={"ops": [{"type": "add", "parent_id": FOLDER_ID, "item": new_item}]},
        )

    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert "collection" in body
    folder = next(i for i in body["collection"]["items"] if i["id"] == FOLDER_ID)
    item_ids = {it["id"] for it in folder["items"]}
    assert "new-req-1" in item_ids

    # Assert the $set payload sent to MongoDB contains the new item
    update_query = mock_update.last_update_query
    assert update_query is not None
    persisted_items = update_query["$set"]["items"]
    persisted_folder = next(i for i in persisted_items if i["id"] == FOLDER_ID)
    persisted_ids = {it["id"] for it in persisted_folder["items"]}
    assert "new-req-1" in persisted_ids


# ── Test: delete op removes an item ──────────────────────────────────────────

@pytest.mark.asyncio
async def test_apply_delta_deletes_item(monkeypatch):
    # After delete, folder has no children
    updated_collection = copy.deepcopy(BASE_COLLECTION)
    updated_collection["items"][0]["items"] = []

    mock_update = _mock_find_one_and_update(updated_collection)
    monkeypatch.setattr("app.api.routes.api_client.collections_delta.db_manager.find_one", _mock_find_one(BASE_COLLECTION))
    monkeypatch.setattr(
        "app.api.routes.api_client.collections_delta.db_manager.find_one_and_update",
        mock_update,
    )
    monkeypatch.setattr("app.api.routes.api_client.collections_delta.bump_version", AsyncMock())

    async with _make_client(OWNER_UID) as ac:
        resp = await ac.post(
            f"/api/v1/api-client/collections/{COLLECTION_ID}/items:apply-delta",
            json={"ops": [{"type": "delete", "item_id": REQUEST_ID}]},
        )

    assert resp.status_code == 200, resp.text
    body = resp.json()
    folder = next(i for i in body["collection"]["items"] if i["id"] == FOLDER_ID)
    assert all(i["id"] != REQUEST_ID for i in folder["items"])

    # Assert the $set payload sent to MongoDB has the item removed
    update_query = mock_update.last_update_query
    assert update_query is not None
    persisted_items = update_query["$set"]["items"]
    persisted_folder = next(i for i in persisted_items if i["id"] == FOLDER_ID)
    assert all(it["id"] != REQUEST_ID for it in persisted_folder["items"])


# ── Test: update op patches fields ───────────────────────────────────────────

@pytest.mark.asyncio
async def test_apply_delta_updates_item(monkeypatch):
    updated_collection = copy.deepcopy(BASE_COLLECTION)
    # Patch the nested request's name
    updated_collection["items"][0]["items"][0]["name"] = "Renamed Request"
    updated_collection["items"][0]["items"][0]["url"] = "https://updated"

    monkeypatch.setattr("app.api.routes.api_client.collections_delta.db_manager.find_one", _mock_find_one(BASE_COLLECTION))
    monkeypatch.setattr(
        "app.api.routes.api_client.collections_delta.db_manager.find_one_and_update",
        _mock_find_one_and_update(updated_collection),
    )
    monkeypatch.setattr("app.api.routes.api_client.collections_delta.bump_version", AsyncMock())

    async with _make_client(OWNER_UID) as ac:
        resp = await ac.post(
            f"/api/v1/api-client/collections/{COLLECTION_ID}/items:apply-delta",
            json={"ops": [{"type": "update", "item_id": REQUEST_ID, "patch": {"name": "Renamed Request", "url": "https://updated"}}]},
        )

    assert resp.status_code == 200, resp.text
    body = resp.json()
    folder = next(i for i in body["collection"]["items"] if i["id"] == FOLDER_ID)
    req = next(i for i in folder["items"] if i["id"] == REQUEST_ID)
    assert req["name"] == "Renamed Request"
    assert req["url"] == "https://updated"


# ── Test: unauthorized user (different uid) gets 404 ─────────────────────────

@pytest.mark.asyncio
async def test_apply_delta_wrong_uid_gets_404(monkeypatch):
    # find_one returns None for OTHER_UID (ownership filter fails)
    monkeypatch.setattr("app.api.routes.api_client.collections_delta.db_manager.find_one", _mock_find_one(BASE_COLLECTION))
    # bump_version should NOT be called
    bump_mock = AsyncMock()
    monkeypatch.setattr("app.api.routes.api_client.collections_delta.bump_version", bump_mock)

    async with _make_client(OTHER_UID) as ac:
        resp = await ac.post(
            f"/api/v1/api-client/collections/{COLLECTION_ID}/items:apply-delta",
            json={"ops": [{"type": "delete", "item_id": REQUEST_ID}]},
        )

    assert resp.status_code == 404
    bump_mock.assert_not_called()


# ── Test: move op with unknown new_parent_id returns 400 ─────────────────────

@pytest.mark.asyncio
async def test_apply_delta_move_unknown_parent_returns_400(monkeypatch):
    monkeypatch.setattr("app.api.routes.api_client.collections_delta.db_manager.find_one", _mock_find_one(BASE_COLLECTION))
    bump_mock = AsyncMock()
    monkeypatch.setattr("app.api.routes.api_client.collections_delta.bump_version", bump_mock)

    async with _make_client(OWNER_UID) as ac:
        resp = await ac.post(
            f"/api/v1/api-client/collections/{COLLECTION_ID}/items:apply-delta",
            json={"ops": [{"type": "move", "item_id": REQUEST_ID, "new_parent_id": "does-not-exist", "new_index": 0}]},
        )

    assert resp.status_code == 400, resp.text
    assert "new_parent_id" in resp.json().get("detail", "")
    bump_mock.assert_not_called()
