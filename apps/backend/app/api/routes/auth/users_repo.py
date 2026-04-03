from __future__ import annotations

import time
from typing import Any

from app.core.db import get_db
from app.utils.collection_name import USERS


def _now_ms() -> int:
    return int(time.time() * 1000)


def users_collection():
    return get_db()[USERS]


def upsert_user_from_firebase_claims(decoded: dict[str, Any]) -> None:
    uid = decoded.get("uid")
    if not uid:
        return
    now = _now_ms()
    doc = {
        "_id": uid,
        "uid": uid,
        "email": decoded.get("email"),
        "display_name": decoded.get("name"),
        "photo_url": decoded.get("picture"),
        "email_verified": bool(decoded.get("email_verified")),
        "disabled": False,
        "updated_at": now,
    }
    users_collection().update_one(
        {"_id": uid},
        {"$set": doc, "$setOnInsert": {"created_at": now}},
        upsert=True,
    )


def get_user_doc(uid: str) -> dict[str, Any] | None:
    return users_collection().find_one({"_id": uid})


def set_refresh_token_hash(uid: str, token_hash: str) -> None:
    now = _now_ms()
    users_collection().update_one(
        {"_id": uid},
        {"$set": {"refresh_token_hash": token_hash, "updated_at": now}},
    )


def clear_refresh_token_hash(uid: str) -> None:
    now = _now_ms()
    users_collection().update_one(
        {"_id": uid},
        {"$unset": {"refresh_token_hash": ""}, "$set": {"updated_at": now}},
    )


def find_uid_by_refresh_hash(token_hash: str) -> str | None:
    doc = users_collection().find_one({"refresh_token_hash": token_hash}, projection={"_id": 1})
    if not doc:
        return None
    uid = doc.get("_id")
    return str(uid) if uid is not None else None
