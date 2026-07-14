from app.database import db_manager
from app.utils.collection_name import (
    AUDIT_LOG,
    USERS,
    WEBAUTHN_CHALLENGES,
)
from app.core.config import get_settings


async def ensure_indexes() -> None:
    await db_manager.create_index(USERS, "refresh_token_hash", sparse=True)
    await db_manager.create_index(USERS, "username", unique=True, sparse=True)
    # Passkeys / WebAuthn
    await db_manager.create_index(USERS, "webauthn_user_handle", unique=True, sparse=True)
    await db_manager.create_index(USERS, "passkeys.credential_id", sparse=True)
    await db_manager.create_index(
        WEBAUTHN_CHALLENGES,
        "created_at",
        expire_after_seconds=get_settings().WEBAUTHN_CHALLENGE_TTL_SECONDS,
    )
    await db_manager.create_index(AUDIT_LOG, [("uid", 1), ("ts", -1)])
    await db_manager.create_index(AUDIT_LOG, [("uid", 1), ("module", 1), ("ts", -1)])
    await db_manager.create_index(AUDIT_LOG, "expireAt", expire_after_seconds=0)
