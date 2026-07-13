from typing import Any
from pymongo.errors import DuplicateKeyError
from app.database import db_manager
from app.utils.collection_name import (
    WORKSPACES,
    WORKSPACE_MEMBERSHIPS,
)
from app.utils.utils import create_timestamp, new_id


async def find_user_workspaces(uid: str) -> list[dict[str, Any]]:
    memberships = await db_manager.find(
        WORKSPACE_MEMBERSHIPS, {"uid": uid}, limit=500
    )
    if not memberships:
        return []
    ws_ids = [m["workspace_id"] for m in memberships]
    workspaces = await db_manager.find(
        WORKSPACES, {"_id": {"$in": ws_ids}, "deleted_at": None}, limit=500
    )
    by_id = {w["_id"]: w for w in workspaces}
    out: list[dict[str, Any]] = []
    for m in memberships:
        ws = by_id.get(m["workspace_id"])
        if ws:
            out.append({**ws, "ws_role": m["ws_role"]})
    return out


async def find_workspace(workspace_id: str) -> dict[str, Any] | None:
    return await db_manager.find_one(WORKSPACES, {"_id": workspace_id})


async def find_ws_membership(
    workspace_id: str, uid: str
) -> dict[str, Any] | None:
    return await db_manager.find_one(
        WORKSPACE_MEMBERSHIPS, {"workspace_id": workspace_id, "uid": uid}
    )


def _personal_slug(uid: str) -> str:
    return f"personal-{uid[:12]}"


# ponytail: workspace creation race tolerated — workspace_setup_at short-circuit in T3
# prevents repeat calls per user. Tighten if a workspace dup is ever observed in prod.
async def upsert_personal_workspace(owner_uid: str) -> str:
    existing = await db_manager.find_one(
        WORKSPACES,
        {
            "owner_uid": owner_uid,
            "is_personal": True,
        },
    )
    if existing:
        return existing["_id"]
    ts = create_timestamp()
    doc = {
        "_id": new_id(),
        "name": "Personal",
        "slug": _personal_slug(owner_uid),
        "is_personal": True,
        "owner_uid": owner_uid,
        "kind": "personal",
        "settings": {"encryption": None},
        "createdAt": ts,
        "updatedAt": ts,
    }
    await db_manager.insert_one(WORKSPACES, doc)
    return doc["_id"]


async def upsert_ws_membership(
    workspace_id: str, uid: str, ws_role: str
) -> None:
    existing = await db_manager.find_one(
        WORKSPACE_MEMBERSHIPS,
        {"workspace_id": workspace_id, "uid": uid},
    )
    if existing:
        return
    try:
        await db_manager.insert_one(
            WORKSPACE_MEMBERSHIPS,
            {
                "_id": new_id(),
                "workspace_id": workspace_id,
                "uid": uid,
                "ws_role": ws_role,
                "createdAt": create_timestamp(),
            },
        )
    except DuplicateKeyError:
        # Concurrent caller won the race — membership already exists, nothing to do.
        existing = await db_manager.find_one(
            WORKSPACE_MEMBERSHIPS, {"workspace_id": workspace_id, "uid": uid}
        )
        if not existing:
            raise


async def set_workspace_deleted(workspace_id: str, deleted_at: int | None) -> None:
    await db_manager.update_one(
        WORKSPACES, {"_id": workspace_id},
        {"$set": {"deleted_at": deleted_at, "updatedAt": create_timestamp()}},
    )
