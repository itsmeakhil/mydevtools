from typing import Any
from app.database import db_manager
from app.utils.collection_name import USERS, WORKSPACES, WORKSPACE_MEMBERSHIPS
from app.utils.utils import create_timestamp


async def set_user_encryption(
    uid: str,
    *,
    public_key: str,
    private_key_encrypted: dict[str, str],
    salt: str,
) -> None:
    await db_manager.update_one(
        USERS,
        {"_id": uid},
        {"$set": {
            "encryption": {
                "publicKey": public_key,
                "privateKeyEncrypted": private_key_encrypted,
                "salt": salt,
                "createdAt": create_timestamp(),
            },
        }},
        upsert=True,
    )


async def get_user_encryption(uid: str) -> dict[str, Any] | None:
    doc = await db_manager.find_one(USERS, {"_id": uid})
    if not doc:
        return None
    return doc.get("encryption")


async def set_membership_wrapped_dek(
    workspace_id: str,
    uid: str,
    wrapped: dict[str, str],     # {encrypted, iv, senderPublicKey}
    version: int,
) -> None:
    await db_manager.update_one(
        WORKSPACE_MEMBERSHIPS,
        {"workspace_id": workspace_id, "uid": uid},
        {"$set": {
            "wrappedDek": wrapped,
            "wrappedDekVersion": version,
        }},
    )


async def get_membership_wrap(workspace_id: str, uid: str) -> dict | None:
    doc = await db_manager.find_one(
        WORKSPACE_MEMBERSHIPS,
        {"workspace_id": workspace_id, "uid": uid},
    )
    if not doc:
        return None
    return {
        "wrappedDek": doc.get("wrappedDek"),
        "wrappedDekVersion": doc.get("wrappedDekVersion", 0),
    }


async def set_workspace_encryption(
    workspace_id: str,
    *,
    scheme: str,
    dek_fingerprint: str,
    rotated_at: int | None = None,
) -> None:
    ws = await db_manager.find_one(WORKSPACES, {"_id": workspace_id})
    existing_enc = (ws.get("settings") or {}).get("encryption") if ws else None
    created_at = (existing_enc or {}).get("createdAt") or create_timestamp()
    await db_manager.update_one(
        WORKSPACES,
        {"_id": workspace_id},
        {"$set": {"settings.encryption": {
            "scheme": scheme,
            "dekFingerprint": dek_fingerprint,
            "createdAt": created_at,
            "rotatedAt": rotated_at,
        }}},
    )


async def bulk_set_wrapped_deks(
    workspace_id: str,
    wraps: list[dict],     # [{uid, wrapped, version}, ...]
) -> None:
    for w in wraps:
        await set_membership_wrapped_dek(
            workspace_id, w["uid"], w["wrapped"], w["version"],
        )


async def find_pending_wraps(workspace_id: str) -> list[dict]:
    docs = await db_manager.find(
        WORKSPACE_MEMBERSHIPS,
        {
            "workspace_id": workspace_id,
            "$or": [
                {"wrappedDek": None},
                {"wrappedDek": {"$exists": False}},
            ],
        },
        limit=200,
    )
    return docs


async def find_users_with_publickey_by_emails(emails: list[str]) -> dict[str, dict]:
    """Return uid -> {publicKey, email} for any registered user with a published keypair."""
    docs = await db_manager.find(
        USERS,
        {"email": {"$in": [e.lower() for e in emails]}, "encryption.publicKey": {"$exists": True}},
        limit=500,
    )
    return {
        d["_id"]: {
            "publicKey": d["encryption"]["publicKey"],
            "email": d["email"],
        }
        for d in docs
        if d.get("encryption") and d["encryption"].get("publicKey")
    }
