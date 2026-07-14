from __future__ import annotations

import logging
from typing import Any

from app.utils.collection_name import COUNTERS, USERS
from app.utils.utils import create_timestamp
from app.core.cache import bump_version
from app.database import db_manager

# First N signups ever get a lifetime Pro grant (early-adopter reward).
EARLY_ADOPTER_LIMIT = 250
SIGNUP_COUNTER_ID = "signups"

logger = logging.getLogger(__name__)


async def _grant_early_adopter_if_slot_free(uid: str, now: int) -> None:
    # Atomic counter, not count_documents: two concurrent signups at slot 249
    # would both count 249 and mint 251 Pros.
    counter = await db_manager.find_one_and_update(
        COUNTERS,
        {"_id": SIGNUP_COUNTER_ID},
        {"$inc": {"seq": 1}},
        return_document=True,
        upsert=True,
    )
    if counter and counter.get("seq", 0) <= EARLY_ADOPTER_LIMIT:
        await db_manager.update_one(
            USERS,
            {"_id": uid},
            {"$set": {"plan": "pro", "plan_source": "early_adopter", "plan_granted_at": now}},
        )


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
    result = await db_manager.update_one(
        USERS,
        {"_id": uid},
        {"$set": doc, "$setOnInsert": {"created_at": now, "onboarding_completed": False}},
        upsert=True,
    )
    if getattr(result, "upserted_id", None) is not None:
        try:
            await _grant_early_adopter_if_slot_free(uid, now)
        except Exception:
            logger.warning("Early-adopter plan grant failed for %s", uid, exc_info=True)


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


async def set_refresh_token_hash(
    uid: str, token_hash: str, long_lived: bool = False
) -> None:
    now = create_timestamp()
    await db_manager.update_one(
        USERS,
        {"_id": uid},
        {
            "$set": {
                "refresh_token_hash": token_hash,
                "refresh_long_lived": long_lived,
                "updated_at": now,
            }
        },
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


async def complete_onboarding(uid: str) -> None:
    now = create_timestamp()
    await db_manager.update_one(
        USERS, {"_id": uid}, {"$set": {"onboarding_completed": True, "updated_at": now}}
    )
    await bump_version(ns="auth_user", uid=uid)


# ── Passkeys / WebAuthn ───────────────────────────────────────────────────────


async def get_or_create_webauthn_user_handle(uid: str, handle_b64: str) -> str:
    """Set handle on first call (conditional, race-safe); return stored value."""
    now = create_timestamp()
    await db_manager.update_one(
        USERS,
        {"_id": uid, "webauthn_user_handle": {"$exists": False}},
        {"$set": {"webauthn_user_handle": handle_b64, "updated_at": now}},
    )
    doc = await db_manager.find_one(USERS, {"_id": uid}, projection={"webauthn_user_handle": 1})
    return (doc or {}).get("webauthn_user_handle") or handle_b64


async def list_passkeys(uid: str) -> list[dict[str, Any]]:
    doc = await db_manager.find_one(USERS, {"_id": uid}, projection={"passkeys": 1})
    return list((doc or {}).get("passkeys") or [])


async def add_passkey(uid: str, passkey: dict[str, Any]) -> None:
    now = create_timestamp()
    await db_manager.update_one(
        USERS,
        {"_id": uid},
        {"$push": {"passkeys": passkey}, "$set": {"updated_at": now}},
    )
    await bump_version(ns="auth_user", uid=uid)


async def remove_passkey(uid: str, credential_id: str) -> int:
    now = create_timestamp()
    res = await db_manager.update_one(
        USERS,
        {"_id": uid, "passkeys.credential_id": credential_id},
        {"$pull": {"passkeys": {"credential_id": credential_id}}, "$set": {"updated_at": now}},
    )
    await bump_version(ns="auth_user", uid=uid)
    return getattr(res, "modified_count", 0)


async def update_passkey_usage(uid: str, credential_id: str, sign_count: int) -> None:
    now = create_timestamp()
    await db_manager.update_one(
        USERS,
        {"_id": uid, "passkeys.credential_id": credential_id},
        {
            "$set": {
                "passkeys.$.sign_count": sign_count,
                "passkeys.$.last_used_at": now,
                "updated_at": now,
            }
        },
    )


async def rename_passkey(uid: str, credential_id: str, device_name: str) -> int:
    now = create_timestamp()
    res = await db_manager.update_one(
        USERS,
        {"_id": uid, "passkeys.credential_id": credential_id},
        {"$set": {"passkeys.$.device_name": device_name, "updated_at": now}},
    )
    return getattr(res, "modified_count", 0)


async def find_user_by_user_handle(user_handle_b64: str) -> dict[str, Any] | None:
    return await db_manager.find_one(USERS, {"webauthn_user_handle": user_handle_b64})


async def find_user_by_credential_id(credential_id: str) -> dict[str, Any] | None:
    return await db_manager.find_one(USERS, {"passkeys.credential_id": credential_id})


# ── Workspace setup ───────────────────────────────────────────────────────────


async def mark_workspace_setup(uid: str, personal_workspace_id: str) -> None:
    await db_manager.update_one(
        USERS,
        {"_id": uid},
        {"$set": {
            "workspace_setup_at": create_timestamp(),
            "personal_workspace_id": personal_workspace_id,
        }},
    )
    await bump_version(ns="auth_user", uid=uid)


async def get_workspace_setup_at(uid: str) -> int | None:
    doc = await db_manager.find_one(USERS, {"_id": uid})
    if not doc:
        return None
    return doc.get("workspace_setup_at")


async def get_personal_workspace_id(uid: str) -> str | None:
    doc = await db_manager.find_one(USERS, {"_id": uid})
    if not doc:
        return None
    return doc.get("personal_workspace_id")


async def mark_migration_pending(uid: str) -> None:
    await db_manager.update_one(
        USERS, {"_id": uid}, {"$set": {"migration_status": "pending"}}
    )
    await bump_version(ns="auth_user", uid=uid)


async def get_migrated_at(uid: str) -> int | None:
    doc = await db_manager.find_one(USERS, {"_id": uid})
    if not doc:
        return None
    return doc.get("migrated_at")


async def get_migration_progress(uid: str) -> dict | None:
    doc = await db_manager.find_one(USERS, {"_id": uid})
    return (doc or {}).get("migration_progress")


async def set_migration_progress(uid: str, progress: dict) -> None:
    await db_manager.update_one(
        USERS, {"_id": uid}, {"$set": {"migration_progress": progress}}
    )
    await bump_version(ns="auth_user", uid=uid)


async def mark_migrated(uid: str) -> None:
    await db_manager.update_one(
        USERS,
        {"_id": uid},
        {"$set": {
            "migrated_at": create_timestamp(),
            "migration_status": "done",
        }},
    )
    await bump_version(ns="auth_user", uid=uid)
