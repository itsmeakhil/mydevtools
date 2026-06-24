from __future__ import annotations

import datetime as dt
from typing import Literal

from app.database import db_manager
from app.utils.collection_name import WEBAUTHN_CHALLENGES

ChallengeKind = Literal["register", "login"]


def _key(kind: ChallengeKind, subject: str) -> str:
    return f"{kind}:{subject}"


async def put(kind: ChallengeKind, subject: str, challenge_b64: str) -> None:
    """Store a challenge keyed by (kind, subject). TTL index expires the doc."""
    now = dt.datetime.now(dt.timezone.utc)
    await db_manager.update_one(
        WEBAUTHN_CHALLENGES,
        {"_id": _key(kind, subject)},
        {"$set": {"challenge": challenge_b64, "kind": kind, "created_at": now}},
        upsert=True,
    )


async def pop(kind: ChallengeKind, subject: str) -> str | None:
    """Atomically fetch + delete the challenge. Returns None if missing/expired."""
    doc = await db_manager.find_one_and_update(
        WEBAUTHN_CHALLENGES,
        {"_id": _key(kind, subject)},
        {"$set": {"_consumed": True}},
        return_document=False,
    )
    if not doc:
        return None
    await db_manager.delete_one(WEBAUTHN_CHALLENGES, {"_id": _key(kind, subject)})
    return doc.get("challenge")
