from typing import Any
from pymongo.errors import DuplicateKeyError
from app.database import db_manager
from app.utils.collection_name import (
    ORGANIZATIONS,
    ORG_MEMBERSHIPS,
    WORKSPACES,
    WORKSPACE_MEMBERSHIPS,
)
from app.utils.utils import create_timestamp, new_id


async def find_user_orgs(uid: str) -> list[dict[str, Any]]:
    memberships = await db_manager.find(
        ORG_MEMBERSHIPS, {"uid": uid}, limit=100
    )
    if not memberships:
        return []
    org_ids = [m["org_id"] for m in memberships]
    orgs = await db_manager.find(
        ORGANIZATIONS, {"_id": {"$in": org_ids}}, limit=100
    )
    by_id = {o["_id"]: o for o in orgs}
    out: list[dict[str, Any]] = []
    for m in memberships:
        org = by_id.get(m["org_id"])
        if org:
            out.append({**org, "org_role": m["org_role"]})
    return out


async def find_user_workspaces(
    uid: str, org_id: str | None = None
) -> list[dict[str, Any]]:
    flt: dict[str, Any] = {"uid": uid}
    if org_id is not None:
        flt["org_id"] = org_id
    memberships = await db_manager.find(
        WORKSPACE_MEMBERSHIPS, flt, limit=500
    )
    if not memberships:
        return []
    ws_ids = [m["workspace_id"] for m in memberships]
    workspaces = await db_manager.find(
        WORKSPACES, {"_id": {"$in": ws_ids}}, limit=500
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


async def find_org_membership(org_id: str, uid: str) -> dict[str, Any] | None:
    return await db_manager.find_one(
        ORG_MEMBERSHIPS, {"org_id": org_id, "uid": uid}
    )


async def find_ws_membership(
    workspace_id: str, uid: str
) -> dict[str, Any] | None:
    return await db_manager.find_one(
        WORKSPACE_MEMBERSHIPS, {"workspace_id": workspace_id, "uid": uid}
    )


async def upsert_org(
    name: str, slug: str, kind: str, owner_uid: str | None
) -> str:
    existing = await db_manager.find_one(ORGANIZATIONS, {"slug": slug})
    if existing:
        return existing["_id"]
    ts = create_timestamp()
    doc = {
        "_id": new_id(),
        "name": name,
        "slug": slug,
        "kind": kind,
        "owner_uid": owner_uid,
        "settings": {},
        "createdAt": ts,
        "updatedAt": ts,
    }
    try:
        await db_manager.insert_one(ORGANIZATIONS, doc)
        return doc["_id"]
    except DuplicateKeyError:
        # Concurrent caller won the race — re-read and return their id.
        existing = await db_manager.find_one(ORGANIZATIONS, {"slug": slug})
        if not existing:
            raise
        return existing["_id"]


async def upsert_org_membership(
    org_id: str, uid: str, org_role: str
) -> None:
    existing = await db_manager.find_one(
        ORG_MEMBERSHIPS, {"org_id": org_id, "uid": uid}
    )
    if existing:
        return
    try:
        await db_manager.insert_one(
            ORG_MEMBERSHIPS,
            {
                "_id": new_id(),
                "org_id": org_id,
                "uid": uid,
                "org_role": org_role,
                "createdAt": create_timestamp(),
            },
        )
    except DuplicateKeyError:
        # Concurrent caller won the race — membership already exists, nothing to do.
        existing = await db_manager.find_one(
            ORG_MEMBERSHIPS, {"org_id": org_id, "uid": uid}
        )
        if not existing:
            raise


def _personal_slug(uid: str) -> str:
    return f"personal-{uid[:12]}"


# ponytail: workspace creation race tolerated — workspace_setup_at short-circuit in T3
# prevents repeat calls per user. Tighten if a workspace dup is ever observed in prod.
async def upsert_personal_workspace(org_id: str, owner_uid: str) -> str:
    existing = await db_manager.find_one(
        WORKSPACES,
        {
            "org_id": org_id,
            "owner_uid": owner_uid,
            "is_personal": True,
        },
    )
    if existing:
        return existing["_id"]
    ts = create_timestamp()
    doc = {
        "_id": new_id(),
        "org_id": org_id,
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
    workspace_id: str, org_id: str, uid: str, ws_role: str
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
                "org_id": org_id,
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
