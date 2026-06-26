from __future__ import annotations

from typing import Optional
from app.api.routes.workspaces.repo import upsert_org
from app.database import db_manager
from app.utils.collection_name import ORGANIZATIONS

SYSTEM_ORG_NAME = "MyDevTools Cloud"
SYSTEM_ORG_SLUG = "mydevtools-cloud"


async def ensure_system_org() -> str:
    """Idempotently create the system org. Returns its id."""
    return await upsert_org(
        name=SYSTEM_ORG_NAME,
        slug=SYSTEM_ORG_SLUG,
        kind="system",
        owner_uid=None,
    )


async def get_system_org_id() -> Optional[str]:
    """Return the singleton system org id, or None if not yet seeded."""
    doc = await db_manager.find_one(ORGANIZATIONS, {"slug": SYSTEM_ORG_SLUG})
    if not doc:
        return None
    return doc["_id"]
