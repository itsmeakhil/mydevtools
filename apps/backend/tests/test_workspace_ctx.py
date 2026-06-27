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


def test_apply_legacy_or_filter_preserves_caller_or():
    ctx = WorkspaceContext(
        uid="u1",
        org_id="o1",
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
        {"org_id": "o1", "workspace_id": "w1", "owner_uid": "u1"},
        {"workspace_id": {"$exists": False}, "created_by": "u1"},
    ]


@pytest.mark.asyncio
async def test_org_owner_gets_implicit_workspace_admin(clean_db, make_request):
    org_id = await upsert_org("Acme", "acme", "user", "owner-uid")
    await upsert_org_membership(org_id, "owner-uid", "owner")
    # Shared workspace (Personal for now, since shared CRUD lands in B5).
    ws_id = await upsert_personal_workspace(org_id, "owner-uid")
    # ONLY org membership exists. NO workspace membership for the owner.
    # ws membership exists for someone else.
    await upsert_org_membership(org_id, "member-uid", "member")
    await upsert_ws_membership(ws_id, org_id, "member-uid", "admin")

    req = make_request(cookies={"active_workspace": ws_id})
    ctx = await get_workspace_ctx(req, uid="owner-uid")
    assert ctx.ws_role == "admin"
    assert ctx.workspace_id == ws_id


@pytest.mark.asyncio
async def test_org_member_without_ws_membership_is_rejected(clean_db, make_request):
    org_id = await upsert_org("Acme2", "acme2", "user", "owner-uid")
    await upsert_org_membership(org_id, "owner-uid", "owner")
    await upsert_org_membership(org_id, "plain-member", "member")
    ws_id = await upsert_personal_workspace(org_id, "owner-uid")
    await upsert_ws_membership(ws_id, org_id, "owner-uid", "admin")

    req = make_request(cookies={"active_workspace": ws_id})
    with pytest.raises(HTTPException) as exc:
        await get_workspace_ctx(req, uid="plain-member")
    assert exc.value.status_code == 403
