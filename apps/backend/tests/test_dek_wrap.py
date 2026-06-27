import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_get_dek_wrap_returns_null_initially(authed_client: AsyncClient, personal_ws_id: str):
    res = await authed_client.get(f"/api/v1/workspaces-api/workspaces/{personal_ws_id}/dek-wrap")
    assert res.status_code == 200
    body = res.json()
    assert body["wrappedDek"] is None
    assert body["wrappedDekVersion"] == 0


@pytest.mark.asyncio
async def test_post_then_get_wrap_roundtrip(authed_client: AsyncClient, personal_ws_id: str):
    # The authed_client uid is "test-uid" (from conftest), and "test-uid" is the
    # sole member of the personal workspace with ws_role="admin", so it can
    # wrap for itself.
    payload = {
        "target_uid": "test-uid",
        "wrapped": {"encrypted": "enc", "iv": "iv", "senderPublicKey": "pk"},
    }
    res = await authed_client.post(
        f"/api/v1/workspaces-api/workspaces/{personal_ws_id}/dek-wrap", json=payload,
    )
    assert res.status_code == 204

    get_res = await authed_client.get(
        f"/api/v1/workspaces-api/workspaces/{personal_ws_id}/dek-wrap",
    )
    assert get_res.status_code == 200
    body = get_res.json()
    assert body["wrappedDek"]["encrypted"] == "enc"
    assert body["wrappedDek"]["iv"] == "iv"
    assert body["wrappedDek"]["senderPublicKey"] == "pk"
    assert body["wrappedDekVersion"] == 1


@pytest.mark.asyncio
async def test_post_wrap_bumps_version_on_second_write(authed_client: AsyncClient, personal_ws_id: str):
    payload = {
        "target_uid": "test-uid",
        "wrapped": {"encrypted": "enc1", "iv": "iv1", "senderPublicKey": "pk1"},
    }
    res = await authed_client.post(
        f"/api/v1/workspaces-api/workspaces/{personal_ws_id}/dek-wrap", json=payload,
    )
    assert res.status_code == 204

    payload2 = {
        "target_uid": "test-uid",
        "wrapped": {"encrypted": "enc2", "iv": "iv2", "senderPublicKey": "pk2"},
    }
    res2 = await authed_client.post(
        f"/api/v1/workspaces-api/workspaces/{personal_ws_id}/dek-wrap", json=payload2,
    )
    assert res2.status_code == 204

    get_res = await authed_client.get(
        f"/api/v1/workspaces-api/workspaces/{personal_ws_id}/dek-wrap",
    )
    body = get_res.json()
    assert body["wrappedDek"]["encrypted"] == "enc2"
    assert body["wrappedDekVersion"] == 2
