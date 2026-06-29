import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_get_keypair_returns_null_when_unset(authed_client: AsyncClient):
    res = await authed_client.get("/api/v1/workspaces-api/users/me/keypair")
    assert res.status_code == 200
    assert res.json() is None


@pytest.mark.asyncio
async def test_post_then_get_keypair_roundtrip(authed_client: AsyncClient):
    payload = {
        "publicKey": "base64-pub-key",
        "privateKeyEncrypted": {"encrypted": "enc-data", "iv": "iv-bytes"},
        "salt": "base64-salt",
    }
    post = await authed_client.post(
        "/api/v1/workspaces-api/users/me/keypair", json=payload,
    )
    assert post.status_code == 204
    get = await authed_client.get("/api/v1/workspaces-api/users/me/keypair")
    assert get.status_code == 200
    body = get.json()
    assert body["publicKey"] == "base64-pub-key"
    assert body["privateKeyEncrypted"]["encrypted"] == "enc-data"
    assert body["salt"] == "base64-salt"
    assert body["createdAt"] > 0
