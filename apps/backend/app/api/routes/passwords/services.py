from typing import Any

from fastapi import HTTPException, status
from pymongo.errors import PyMongoError

from app.api.routes.passwords.schema import (
    KeyVerifier,
    PasswordEntryCreate,
    PasswordEntryOut,
    PasswordEntryUpdate,
    VaultOut,
    VaultSetupRequest,
)
from app.core.cache import bump_version, cached
from app.database import db_manager
from app.utils.collection_name import PASSWORD_ENTRIES, PASSWORD_VAULTS
from app.utils.crud import safe_delete_one, safe_insert, safe_update_one
from app.utils.utils import create_timestamp, new_id


def _vault_doc_to_out(doc: dict[str, Any]) -> VaultOut:
    verifier_raw = doc.get("verifier") or {}
    salt = doc.get("salt")
    if not salt:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Vault salt missing.")

    verifier_enc = verifier_raw.get("encrypted")
    verifier_iv = verifier_raw.get("iv")
    if not verifier_enc or not verifier_iv:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Vault verifier missing.")

    created_at = int(doc.get("createdAt", 0))
    if created_at <= 0:
        created_at = create_timestamp()

    return VaultOut(
        salt=str(salt),
        verifier=KeyVerifier(encrypted=str(verifier_enc), iv=str(verifier_iv)),
        createdAt=created_at,
    )


def _entry_doc_to_out(doc: dict[str, Any], *, entry_id: str) -> PasswordEntryOut:
    created_at = int(doc.get("createdAt", 0)) or create_timestamp()
    updated_at = int(doc.get("updatedAt", 0)) or created_at
    return PasswordEntryOut(
        id=entry_id,
        encryptedData=str(doc.get("encryptedData", "")),
        iv=str(doc.get("iv", "")),
        createdAt=created_at,
        updatedAt=updated_at,
    )


@cached(ns="passwords", ttl=60, scope="user")
async def get_vault(*, uid: str) -> VaultOut:
    doc = await db_manager.find_one(PASSWORD_VAULTS, {"created_by": uid})
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vault not found.")
    return _vault_doc_to_out(doc)


async def setup_vault(uid: str, body: VaultSetupRequest) -> VaultOut:
    existing = await db_manager.find_one(PASSWORD_VAULTS, {"created_by": uid})
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Vault already exists. Delete the existing vault first.",
        )

    ts_created = int(body.createdAt) if body.createdAt is not None else create_timestamp()
    ts_updated = create_timestamp()

    doc: dict[str, Any] = {
        "created_by": uid,
        "salt": body.salt,
        "verifier": {"encrypted": body.verifier.encrypted, "iv": body.verifier.iv},
        "createdAt": ts_created,
        "updatedAt": ts_updated,
    }
    await safe_insert(PASSWORD_VAULTS, doc, name="Vault")
    await bump_version(ns="passwords", uid=uid)
    return await get_vault(uid=uid)


@cached(ns="passwords", ttl=60, scope="user")
async def list_entries(*, uid: str, limit: int = 200, offset: int = 0) -> list[PasswordEntryOut]:
    docs = await db_manager.find(
        PASSWORD_ENTRIES,
        {"created_by": uid},
        sort=[("updatedAt", -1), ("createdAt", -1)],
        skip=max(0, offset),
        limit=max(1, limit),
    )
    return [_entry_doc_to_out(d, entry_id=str(d.get("_id", ""))) for d in docs]


async def create_entry(uid: str, body: PasswordEntryCreate) -> PasswordEntryOut:
    eid = new_id()
    ts = create_timestamp()
    created_at = int(body.createdAt) if body.createdAt is not None else ts
    updated_at = int(body.updatedAt) if body.updatedAt is not None else created_at

    doc: dict[str, Any] = {
        "_id": eid,
        "created_by": uid,
        "encryptedData": body.encryptedData,
        "iv": body.iv,
        "createdAt": created_at,
        "updatedAt": updated_at,
    }
    await safe_insert(PASSWORD_ENTRIES, doc, name="Entry")
    await bump_version(ns="passwords", uid=uid)
    return _entry_doc_to_out(doc, entry_id=eid)


@cached(ns="passwords", ttl=60, scope="user")
async def get_entry(*, uid: str, entry_id: str) -> PasswordEntryOut:
    doc = await db_manager.find_one(PASSWORD_ENTRIES, {"_id": entry_id, "created_by": uid})
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Entry not found.")
    return _entry_doc_to_out(doc, entry_id=entry_id)


async def update_entry(uid: str, entry_id: str, body: PasswordEntryUpdate) -> PasswordEntryOut:
    ts_updated = int(body.updatedAt) if body.updatedAt is not None else create_timestamp()
    patch: dict[str, Any] = {
        "encryptedData": body.encryptedData,
        "iv": body.iv,
        "updatedAt": ts_updated,
    }
    doc = await safe_update_one(
        PASSWORD_ENTRIES,
        {"_id": entry_id, "created_by": uid},
        patch,
        name="Entry",
    )
    await bump_version(ns="passwords", uid=uid)
    return _entry_doc_to_out(doc, entry_id=entry_id)


async def delete_entry(uid: str, entry_id: str) -> None:
    await safe_delete_one(PASSWORD_ENTRIES, {"_id": entry_id, "created_by": uid}, name="Entry")
    await bump_version(ns="passwords", uid=uid)


async def clear_entries(uid: str) -> dict[str, int]:
    try:
        res = await db_manager.delete_many(PASSWORD_ENTRIES, {"created_by": uid})
    except PyMongoError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to clear entries."
        ) from exc
    await bump_version(ns="passwords", uid=uid)
    return {"entriesDeleted": int(res.deleted_count)}


async def clear_vault(uid: str) -> dict[str, int]:
    entries_deleted = (await clear_entries(uid))["entriesDeleted"]
    try:
        res = await db_manager.delete_many(PASSWORD_VAULTS, {"created_by": uid})
    except PyMongoError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to clear vault."
        ) from exc
    await bump_version(ns="passwords", uid=uid)
    return {"entriesDeleted": entries_deleted, "vaultDeleted": int(res.deleted_count)}
