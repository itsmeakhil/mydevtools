import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_pending_wraps_empty_initially(authed_client: AsyncClient, personal_ws_id: str):
    res = await authed_client.get(
        f"/api/v1/workspaces-api/workspaces/{personal_ws_id}/pending-wraps",
    )
    assert res.status_code == 200
    # The sole member (test-uid) has wrappedDek=None initially, so they appear
    # in the pending list.  The personal workspace is bootstrapped with one
    # membership doc but no wrappedDek set yet.
    body = res.json()
    assert isinstance(body, list)
    # The bootstrapped member has no wrap yet, so they should appear.
    uids = [item["uid"] for item in body]
    assert "test-uid" in uids


@pytest.mark.asyncio
async def test_pending_wraps_disappears_after_wrap_posted(authed_client: AsyncClient, personal_ws_id: str):
    # Post a wrap for the sole member (test-uid).
    payload = {
        "target_uid": "test-uid",
        "wrapped": {"encrypted": "enc", "iv": "iv", "senderPublicKey": "pk"},
    }
    post_res = await authed_client.post(
        f"/api/v1/workspaces-api/workspaces/{personal_ws_id}/dek-wrap", json=payload,
    )
    assert post_res.status_code == 204

    # Now pending-wraps should not include test-uid.
    res = await authed_client.get(
        f"/api/v1/workspaces-api/workspaces/{personal_ws_id}/pending-wraps",
    )
    assert res.status_code == 200
    body = res.json()
    uids = [item["uid"] for item in body]
    assert "test-uid" not in uids
