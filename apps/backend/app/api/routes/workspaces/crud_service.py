import re
from fastapi import HTTPException
from app.api.routes.workspaces import repo
from app.api.routes.workspaces.schema import OrgCreate, OrgOut, OrgPatch
from app.database import db_manager
from app.utils.collection_name import ORGANIZATIONS, WORKSPACES
from app.utils.utils import create_timestamp


def _slugify(name: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")
    return slug or "untitled"


async def _org_to_out(org: dict, uid: str) -> OrgOut:
    mem = await repo.find_org_membership(org["_id"], uid)
    return OrgOut(
        id=org["_id"],
        name=org["name"],
        slug=org["slug"],
        kind=org["kind"],
        org_role=mem["org_role"] if mem else "viewer",
    )


async def _require_org(org_id: str) -> dict:
    org = await repo.find_org(org_id)
    if not org:
        raise HTTPException(status_code=404, detail="Org not found")
    return org


async def create_org(uid: str, body: OrgCreate) -> OrgOut:
    slug = body.slug or _slugify(body.name)
    org_id = await repo.upsert_org(
        name=body.name,
        slug=slug,
        kind="user",
        owner_uid=uid,
    )
    await repo.upsert_org_membership(org_id, uid, "owner")
    org = await _require_org(org_id)
    return await _org_to_out(org, uid)


async def rename_org(uid: str, org_id: str, body: OrgPatch) -> OrgOut:
    mem = await repo.find_org_membership(org_id, uid)
    if not mem or mem["org_role"] not in ("owner", "admin"):
        raise HTTPException(status_code=403, detail="Org admin required")
    org = await _require_org(org_id)
    if org["kind"] == "system":
        raise HTTPException(status_code=403, detail="System org cannot be modified")
    if body.name and body.name != org["name"]:
        await db_manager.update_one(
            ORGANIZATIONS,
            {"_id": org_id},
            {"$set": {"name": body.name, "updatedAt": create_timestamp()}},
        )
    org = await _require_org(org_id)
    return await _org_to_out(org, uid)


async def delete_org(uid: str, org_id: str) -> None:
    mem = await repo.find_org_membership(org_id, uid)
    if not mem or mem["org_role"] != "owner":
        raise HTTPException(status_code=403, detail="Org owner required")
    org = await _require_org(org_id)
    if org["kind"] == "system":
        raise HTTPException(status_code=403, detail="System org cannot be deleted")
    ts = create_timestamp()
    await repo.set_org_deleted(org_id, ts)
    # Cascade soft-delete on all non-deleted workspaces in the org.
    await db_manager.update_many(
        WORKSPACES,
        {"org_id": org_id, "deleted_at": None},
        {"$set": {"deleted_at": ts}},
    )
