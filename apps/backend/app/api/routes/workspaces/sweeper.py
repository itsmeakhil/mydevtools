import asyncio
import logging
from app.database import db_manager
from app.utils.collection_name import (
    INVITATIONS, ORGANIZATIONS, WORKSPACES,
    ORG_MEMBERSHIPS, WORKSPACE_MEMBERSHIPS,
)
from app.utils.utils import create_timestamp

log = logging.getLogger(__name__)
SOFT_DELETE_RETENTION_MS = 30 * 24 * 3600 * 1000


async def _hard_delete_orgs(threshold: int) -> int:
    olds = await db_manager.find(
        ORGANIZATIONS,
        {"deleted_at": {"$ne": None, "$lt": threshold}},
        limit=500,
    )
    if not olds:
        return 0
    org_ids = [o["_id"] for o in olds]
    await db_manager.delete_many(ORG_MEMBERSHIPS, {"org_id": {"$in": org_ids}})
    await db_manager.delete_many(WORKSPACE_MEMBERSHIPS, {"org_id": {"$in": org_ids}})
    await db_manager.delete_many(WORKSPACES, {"org_id": {"$in": org_ids}})
    await db_manager.delete_many(ORGANIZATIONS, {"_id": {"$in": org_ids}})
    return len(org_ids)


async def _hard_delete_workspaces(threshold: int) -> int:
    olds = await db_manager.find(
        WORKSPACES,
        {"deleted_at": {"$ne": None, "$lt": threshold}, "is_personal": False},
        limit=500,
    )
    if not olds:
        return 0
    ws_ids = [w["_id"] for w in olds]
    await db_manager.delete_many(WORKSPACE_MEMBERSHIPS, {"workspace_id": {"$in": ws_ids}})
    await db_manager.delete_many(WORKSPACES, {"_id": {"$in": ws_ids}})
    return len(ws_ids)


async def _expire_invitations(now: int) -> int:
    res = await db_manager.update_many(
        INVITATIONS,
        {"status": "pending", "expires_at": {"$lt": now}},
        {"$set": {"status": "expired"}},
    )
    return getattr(res, "modified_count", 0)


async def run_sweeper_once() -> dict[str, int]:
    now = create_timestamp()
    threshold = now - SOFT_DELETE_RETENTION_MS
    return {
        "orgs_hard_deleted": await _hard_delete_orgs(threshold),
        "workspaces_hard_deleted": await _hard_delete_workspaces(threshold),
        "invitations_expired": await _expire_invitations(now),
    }


async def sweeper_loop(interval_seconds: int = 3600) -> None:
    while True:
        try:
            stats = await run_sweeper_once()
            if any(stats.values()):
                log.info("sweeper: %s", stats)
        except Exception as exc:
            log.warning("sweeper error: %s", exc)
        await asyncio.sleep(interval_seconds)
