import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_list_member_publickeys_for_admin(authed_client: AsyncClient, personal_ws_id: str):
    res = await authed_client.get(
        f"/api/v1/workspaces-api/workspaces/{personal_ws_id}/member-publickeys",
    )
    assert res.status_code == 200
    members = res.json()
    assert len(members) >= 1
    assert members[0]["uid"] == "test-uid"
    # publicKey is None initially (keypair not generated)
    assert members[0]["publicKey"] is None
