from fastapi import HTTPException
from app.api.routes.auth.users_repo import get_user_doc
from app.api.routes.workspaces import repo
from app.api.routes.workspaces.schema import MemberOut
from app.database import db_manager
from app.utils.collection_name import (
    ORG_MEMBERSHIPS, WORKSPACE_MEMBERSHIPS, WORKSPACES,
)
from app.utils.utils import create_timestamp


async def _membership_to_out(mem: dict, role_field: str) -> MemberOut:
    user = await get_user_doc(mem["uid"]) or {}
    return MemberOut(
        uid=mem["uid"],
        email=user.get("email"),
        display_name=user.get("display_name"),
        role=mem[role_field],
        since=int(mem.get("createdAt", 0)),
    )


async def list_org_members(uid: str, org_id: str) -> list[MemberOut]:
    caller = await repo.find_org_membership(org_id, uid)
    if not caller:
        raise HTTPException(403, "Not an org member")
    members = await repo.find_org_members(org_id)
    return [await _membership_to_out(m, "org_role") for m in members]


async def list_workspace_members(uid: str, ws_id: str) -> list[MemberOut]:
    ws = await repo.find_workspace(ws_id)
    if not ws:
        raise HTTPException(404, "Workspace not found")
    caller_org_mem = await repo.find_org_membership(ws["org_id"], uid)
    caller_ws_mem = await repo.find_ws_membership(ws_id, uid)
    if not caller_ws_mem and not (
        caller_org_mem and caller_org_mem["org_role"] in ("owner", "admin")
    ):
        raise HTTPException(403, "Not a workspace member")
    members = await repo.find_workspace_members(ws_id)
    return [await _membership_to_out(m, "ws_role") for m in members]


def _validate_org_role(role: str) -> None:
    if role not in ("owner", "admin", "member", "viewer"):
        raise HTTPException(400, "Invalid org role")


def _validate_ws_role(role: str) -> None:
    if role not in ("admin", "developer", "viewer"):
        raise HTTPException(400, "Invalid ws role")


async def change_org_role(
    uid: str, org_id: str, target_uid: str, role: str,
) -> MemberOut:
    _validate_org_role(role)
    caller = await repo.find_org_membership(org_id, uid)
    if not caller or caller["org_role"] not in ("owner", "admin"):
        raise HTTPException(403, "Org admin required")
    target = await repo.find_org_membership(org_id, target_uid)
    if not target:
        raise HTTPException(404, "Target not in org")
    if target["org_role"] == "owner" and role != "owner":
        owners = [
            m for m in await repo.find_org_members(org_id)
            if m["org_role"] == "owner"
        ]
        if len(owners) == 1:
            raise HTTPException(400, "Cannot demote sole owner")
    await db_manager.update_one(
        ORG_MEMBERSHIPS,
        {"org_id": org_id, "uid": target_uid},
        {"$set": {"org_role": role, "updatedAt": create_timestamp()}},
    )
    updated = await repo.find_org_membership(org_id, target_uid)
    return await _membership_to_out(updated, "org_role")


async def change_workspace_role(
    uid: str, ws_id: str, target_uid: str, role: str,
) -> MemberOut:
    _validate_ws_role(role)
    ws = await repo.find_workspace(ws_id)
    if not ws:
        raise HTTPException(404, "Workspace not found")
    caller_org_mem = await repo.find_org_membership(ws["org_id"], uid)
    caller_ws_mem = await repo.find_ws_membership(ws_id, uid)
    is_admin = (
        (caller_org_mem and caller_org_mem["org_role"] in ("owner", "admin"))
        or (caller_ws_mem and caller_ws_mem["ws_role"] == "admin")
    )
    if not is_admin:
        raise HTTPException(403, "Workspace admin required")
    target = await repo.find_ws_membership(ws_id, target_uid)
    if not target:
        raise HTTPException(404, "Target not in workspace")
    await db_manager.update_one(
        WORKSPACE_MEMBERSHIPS,
        {"workspace_id": ws_id, "uid": target_uid},
        {"$set": {"ws_role": role, "updatedAt": create_timestamp()}},
    )
    updated = await repo.find_ws_membership(ws_id, target_uid)
    return await _membership_to_out(updated, "ws_role")


async def remove_org_member(uid: str, org_id: str, target_uid: str) -> None:
    caller = await repo.find_org_membership(org_id, uid)
    if not caller or caller["org_role"] not in ("owner", "admin"):
        raise HTTPException(403, "Org admin required")
    target = await repo.find_org_membership(org_id, target_uid)
    if not target:
        raise HTTPException(404, "Target not in org")
    if target["org_role"] == "owner":
        owners = [
            m for m in await repo.find_org_members(org_id)
            if m["org_role"] == "owner"
        ]
        if len(owners) == 1:
            raise HTTPException(400, "Cannot remove sole owner")
    # Delete org membership
    await db_manager.delete_one(
        ORG_MEMBERSHIPS, {"org_id": org_id, "uid": target_uid},
    )
    # Cascade — drop all ws memberships in this org for target
    ws_in_org = await db_manager.find(WORKSPACES, {"org_id": org_id}, limit=500)
    ws_ids = [w["_id"] for w in ws_in_org]
    if ws_ids:
        await db_manager.delete_many(
            WORKSPACE_MEMBERSHIPS,
            {"workspace_id": {"$in": ws_ids}, "uid": target_uid},
        )


async def remove_workspace_member(uid: str, ws_id: str, target_uid: str) -> None:
    ws = await repo.find_workspace(ws_id)
    if not ws:
        raise HTTPException(404, "Workspace not found")
    caller_org_mem = await repo.find_org_membership(ws["org_id"], uid)
    caller_ws_mem = await repo.find_ws_membership(ws_id, uid)
    is_admin = (
        (caller_org_mem and caller_org_mem["org_role"] in ("owner", "admin"))
        or (caller_ws_mem and caller_ws_mem["ws_role"] == "admin")
    )
    if not is_admin:
        raise HTTPException(403, "Workspace admin required")
    await db_manager.delete_one(
        WORKSPACE_MEMBERSHIPS, {"workspace_id": ws_id, "uid": target_uid},
    )
