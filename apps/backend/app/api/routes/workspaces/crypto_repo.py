from typing import Any
from app.database import db_manager
from app.utils.collection_name import USERS
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
