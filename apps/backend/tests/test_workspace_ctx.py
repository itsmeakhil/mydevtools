import pytest
from fastapi import HTTPException
from app.api.routes.workspaces.middleware import (
    WorkspaceContext,
    apply_legacy_or_filter,
    apply_workspace_filter,
    default_personal_ws_id,
    get_workspace_ctx,
)
from app.api.routes.workspaces.repo import (
    upsert_org,
    upsert_org_membership,
    upsert_personal_workspace,
    upsert_ws_membership,
)


@pytest.mark.asyncio
async def test_get_workspace_ctx_rejects_non_member(make_request, clean_db):
    org_id = await upsert_org("Acme", "acme", "user", "owner-uid")
    await upsert_org_membership(org_id, "owner-uid", "owner")
    ws_id = await upsert_personal_workspace(org_id, "owner-uid")
    await upsert_ws_membership(ws_id, org_id, "owner-uid", "admin")

    req = make_request(cookies={"active_workspace": ws_id})
    with pytest.raises(HTTPException) as exc:
        await get_workspace_ctx(req, uid="someone-else")
    assert exc.value.status_code == 403


@pytest.mark.asyncio
async def test_default_personal_ws_id_returns_personal_ws(clean_db):
    org_id = await upsert_org("MyDevTools Cloud", "mydevtools-cloud", "system", None)
    await upsert_org_membership(org_id, "u1", "member")
    ws_id = await upsert_personal_workspace(org_id, "u1")
    await upsert_ws_membership(ws_id, org_id, "u1", "admin")

    assert await default_personal_ws_id("u1") == ws_id


def test_apply_workspace_filter_personal_adds_owner_uid():
    ctx = WorkspaceContext(
        uid="u1",
        org_id="o1",
        workspace_id="w1",
        ws_role="admin",
        is_personal=True,
        owner_uid="u1",
    )
    out = apply_workspace_filter(ctx, {"foo": "bar"})
    assert out == {
        "foo": "bar",
        "org_id": "o1",
        "workspace_id": "w1",
        "owner_uid": "u1",
    }


def test_apply_legacy_or_filter_bounds_by_user_field():
    ctx = WorkspaceContext(
        uid="u1",
        org_id="o1",
        workspace_id="w1",
        ws_role="admin",
        is_personal=True,
        owner_uid="u1",
    )
    out = apply_legacy_or_filter(ctx, {"foo": "bar"}, user_field="created_by")
    assert out["$or"] == [
        {"org_id": "o1", "workspace_id": "w1", "owner_uid": "u1"},
        {"workspace_id": {"$exists": False}, "created_by": "u1"},
    ]
    assert out["foo"] == "bar"
