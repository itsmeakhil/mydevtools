from __future__ import annotations

from typing import Any

from app.utils.collection_name import USERS
from app.utils.utils import create_timestamp
from app.core.cache import bump_version
from app.database import db_manager


async def upsert_user_from_firebase_claims(decoded: dict[str, Any]) -> None:
    uid = decoded.get("uid")
    if not uid:
        return
    now = create_timestamp()
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
    await db_manager.update_one(
        USERS,
        {"_id": uid},
        {"$set": doc, "$setOnInsert": {"created_at": now, "onboarding_completed": False}},
        upsert=True,
    )


async def get_user_doc(uid: str) -> dict[str, Any] | None:
    return await db_manager.find_one(USERS, {"_id": uid})


async def is_username_taken(username: str, exclude_uid: str) -> bool:
    count = await db_manager.count_documents(USERS, {"username": username, "_id": {"$ne": exclude_uid}})
    return count > 0


async def get_user_doc_by_username(username: str) -> dict[str, Any] | None:
    return await db_manager.find_one(USERS, {"username": username})


async def update_user_profile(uid: str, updates: dict[str, Any]) -> None:
    if not updates:
        return
    now = create_timestamp()
    updates["updated_at"] = now
    await db_manager.update_one(USERS, {"_id": uid}, {"$set": updates})
    await bump_version(ns="auth_user", uid=uid)


async def set_refresh_token_hash(uid: str, token_hash: str) -> None:
    now = create_timestamp()
    await db_manager.update_one(
        USERS,
        {"_id": uid},
        {"$set": {"refresh_token_hash": token_hash, "updated_at": now}},
    )
    await bump_version(ns="auth_user", uid=uid)


async def clear_refresh_token_hash(uid: str) -> None:
    now = create_timestamp()
    await db_manager.update_one(
        USERS, {"_id": uid}, {"$unset": {"refresh_token_hash": ""}, "$set": {"updated_at": now}}
    )
    await bump_version(ns="auth_user", uid=uid)


async def find_uid_by_refresh_hash(token_hash: str) -> str | None:
    doc = await db_manager.find_one(USERS, {"refresh_token_hash": token_hash}, projection={"_id": 1})
    if not doc:
        return None
    uid = doc.get("_id")
    return str(uid) if uid is not None else None


async def get_master_vault(uid: str) -> dict[str, Any] | None:
    doc = await get_user_doc(uid)
    if not doc:
        return None
    return doc.get("master_vault") or None


async def set_master_vault(uid: str, vault: dict[str, Any]) -> None:
    now = create_timestamp()
    await db_manager.update_one(USERS, {"_id": uid}, {"$set": {"master_vault": vault, "updated_at": now}})
    await bump_version(ns="auth_user", uid=uid)


async def set_backup_codes(uid: str, codes: list[dict[str, Any]]) -> None:
    now = create_timestamp()
    await db_manager.update_one(USERS, {"_id": uid}, {"$set": {"backup_codes": codes, "updated_at": now}})
    await bump_version(ns="auth_user", uid=uid)


async def get_backup_code_by_id(uid: str, code_id: str) -> dict[str, Any] | None:
    doc = await get_user_doc(uid)
    if not doc:
        return None
    codes: list[dict] = doc.get("backup_codes") or []
    for code in codes:
        if code.get("codeId") == code_id and not code.get("used"):
            return code
    return None


async def complete_onboarding(uid: str) -> None:
    now = create_timestamp()
    await db_manager.update_one(
        USERS, {"_id": uid}, {"$set": {"onboarding_completed": True, "updated_at": now}}
    )
    await bump_version(ns="auth_user", uid=uid)


async def mark_backup_code_used(uid: str, code_id: str) -> None:
    now = create_timestamp()
    await db_manager.update_one(
        USERS,
        {"_id": uid, "backup_codes.codeId": code_id},
        {"$set": {"backup_codes.$.used": True, "updated_at": now}},
    )
    await bump_version(ns="auth_user", uid=uid)
