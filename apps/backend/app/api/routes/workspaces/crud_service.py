import re
from fastapi import HTTPException
from app.api.routes.workspaces import repo
from app.api.routes.workspaces.schema import OrgCreate, OrgOut, OrgPatch, WorkspaceCreate, WorkspacePatch, WorkspaceOut
from app.database import db_manager
from app.utils.collection_name import ORGANIZATIONS, WORKSPACES
from app.utils.utils import create_timestamp, new_id


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


async def _ws_to_out(ws: dict, ws_role: str) -> WorkspaceOut:
    return WorkspaceOut(
        id=ws["_id"],
        org_id=ws["org_id"],
        name=ws["name"],
        slug=ws["slug"],
        is_personal=bool(ws.get("is_personal")),
        kind=ws.get("kind", "shared"),
        ws_role=ws_role,
        settings=ws.get("settings") or {},
    )


async def create_shared_workspace(
    uid: str, org_id: str, body: WorkspaceCreate,
) -> WorkspaceOut:
    org = await repo.find_org(org_id)
    if not org:
        raise HTTPException(status_code=404, detail="Org not found")
    org_mem = await repo.find_org_membership(org_id, uid)
    if not org_mem:
        raise HTTPException(status_code=403, detail="Not a member of this org")
    # System orgs (Mydevtools Cloud) let any member create their own workspaces —
    # listings are per-user, so workspaces here don't leak across the tenant.
    is_system = org.get("kind") == "system"
    if not is_system and org_mem["org_role"] not in ("owner", "admin"):
        raise HTTPException(status_code=403, detail="Org admin required")
    slug = body.slug or _slugify(body.name)
    ts = create_timestamp()
    doc = {
        "_id": new_id(),
        "org_id": org_id,
        "name": body.name,
        "slug": slug,
        "is_personal": False,
        "owner_uid": None,
        "kind": "shared",
        "settings": {"encryption": None},
        "createdAt": ts,
        "updatedAt": ts,
        "deleted_at": None,
    }
    await db_manager.insert_one(WORKSPACES, doc)
    # Create explicit ws membership so the listing endpoint surfaces the workspace.
    await repo.upsert_ws_membership(doc["_id"], org_id, uid, "admin")
    return await _ws_to_out(doc, "admin")


async def rename_workspace(
    uid: str, ws_id: str, body: WorkspacePatch,
) -> WorkspaceOut:
    ws = await repo.find_workspace(ws_id)
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found")
    if ws.get("is_personal"):
        raise HTTPException(status_code=403, detail="Personal workspace is locked")
    org_mem = await repo.find_org_membership(ws["org_id"], uid)
    if not org_mem or org_mem["org_role"] not in ("owner", "admin"):
        ws_mem = await repo.find_ws_membership(ws_id, uid)
        if not ws_mem or ws_mem["ws_role"] != "admin":
            raise HTTPException(status_code=403, detail="Workspace admin required")
    if body.name and body.name != ws["name"]:
        await db_manager.update_one(
            WORKSPACES, {"_id": ws_id},
            {"$set": {"name": body.name, "updatedAt": create_timestamp()}},
        )
    ws = await repo.find_workspace(ws_id)
    mem = await repo.find_ws_membership(ws_id, uid)
    return await _ws_to_out(ws, (mem or {"ws_role": "admin"})["ws_role"])


async def delete_workspace(uid: str, ws_id: str) -> None:
    ws = await repo.find_workspace(ws_id)
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found")
    if ws.get("is_personal"):
        raise HTTPException(status_code=403, detail="Personal workspace is locked")
    org_mem = await repo.find_org_membership(ws["org_id"], uid)
    if not org_mem or org_mem["org_role"] not in ("owner", "admin"):
        raise HTTPException(status_code=403, detail="Org admin required")
    await repo.set_workspace_deleted(ws_id, create_timestamp())
