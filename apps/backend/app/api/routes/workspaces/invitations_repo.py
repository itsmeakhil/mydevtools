from typing import Any
from app.database import db_manager
from app.utils.collection_name import INVITATIONS


async def create_invitation(doc: dict[str, Any]) -> str:
    await db_manager.insert_one(INVITATIONS, doc)
    return doc["_id"]


async def find_invitation_by_token(token: str) -> dict[str, Any] | None:
    return await db_manager.find_one(INVITATIONS, {"token": token})


async def find_pending_for_email(email: str) -> list[dict[str, Any]]:
    return await db_manager.find(
        INVITATIONS,
        {"invited_email": email.lower(), "status": "pending"},
        limit=50,
    )


async def find_pending_for_org(org_id: str) -> list[dict[str, Any]]:
    return await db_manager.find(
        INVITATIONS,
        {"org_id": org_id, "status": "pending"},
        limit=200,
    )


async def update_invitation_status(
    invitation_id: str,
    status: str,
    accepted_uid: str | None = None,
    accepted_at: int | None = None,
) -> None:
    patch: dict[str, Any] = {"status": status}
    if accepted_uid is not None:
        patch["accepted_uid"] = accepted_uid
    if accepted_at is not None:
        patch["accepted_at"] = accepted_at
    await db_manager.update_one(INVITATIONS, {"_id": invitation_id}, {"$set": patch})
