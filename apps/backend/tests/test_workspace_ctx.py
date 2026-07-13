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
    upsert_personal_workspace,
    upsert_ws_membership,
)


@pytest.mark.asyncio
async def test_get_workspace_ctx_rejects_non_member(make_request, clean_db):
    ws_id = await upsert_personal_workspace("owner-uid")
    await upsert_ws_membership(ws_id, "owner-uid", "admin")

    req = make_request(cookies={"active_workspace": ws_id})
    with pytest.raises(HTTPException) as exc:
        await get_workspace_ctx(req, uid="someone-else")
    assert exc.value.status_code == 403


@pytest.mark.asyncio
async def test_default_personal_ws_id_returns_personal_ws(clean_db):
    ws_id = await upsert_personal_workspace("u1")
    await upsert_ws_membership(ws_id, "u1", "admin")

    assert await default_personal_ws_id("u1") == ws_id


def test_apply_workspace_filter_personal_adds_owner_uid():
    ctx = WorkspaceContext(
        uid="u1",
        workspace_id="w1",
        ws_role="admin",
        is_personal=True,
        owner_uid="u1",
    )
    out = apply_workspace_filter(ctx, {"foo": "bar"})
    assert out == {
        "foo": "bar",
        "workspace_id": "w1",
        "owner_uid": "u1",
    }


def test_apply_legacy_or_filter_bounds_by_user_field():
    ctx = WorkspaceContext(
        uid="u1",
        workspace_id="w1",
        ws_role="admin",
        is_personal=True,
        owner_uid="u1",
    )
    out = apply_legacy_or_filter(ctx, {"foo": "bar"}, user_field="created_by")
    assert out["$or"] == [
        {"workspace_id": "w1", "owner_uid": "u1"},
        {"workspace_id": {"$exists": False}, "created_by": "u1"},
    ]
    assert out["foo"] == "bar"


def test_apply_legacy_or_filter_preserves_caller_or():
    ctx = WorkspaceContext(
        uid="u1",
        workspace_id="w1",
        ws_role="admin",
        is_personal=True,
        owner_uid="u1",
    )
    base = {"$or": [{"folderId": None}, {"folderId": {"$exists": False}}]}
    out = apply_legacy_or_filter(ctx, base, user_field="created_by")
    # Caller's $or must be preserved — combined via $and with workspace $or.
    assert "$and" in out
    assert out["$and"][0] == base
    assert out["$and"][1]["$or"] == [
        {"workspace_id": "w1", "owner_uid": "u1"},
        {"workspace_id": {"$exists": False}, "created_by": "u1"},
    ]


@pytest.mark.asyncio
async def test_admin_member_gets_workspace_ctx(clean_db, make_request):
    ws_id = await upsert_personal_workspace("owner-uid")
    await upsert_ws_membership(ws_id, "owner-uid", "admin")

    req = make_request(cookies={"active_workspace": ws_id})
    ctx = await get_workspace_ctx(req, uid="owner-uid")
    assert ctx.ws_role == "admin"
    assert ctx.workspace_id == ws_id


@pytest.mark.asyncio
async def test_non_member_without_ws_membership_is_rejected(clean_db, make_request):
    ws_id = await upsert_personal_workspace("owner-uid")
    await upsert_ws_membership(ws_id, "owner-uid", "admin")

    req = make_request(cookies={"active_workspace": ws_id})
    with pytest.raises(HTTPException) as exc:
        await get_workspace_ctx(req, uid="plain-member")
    assert exc.value.status_code == 403
