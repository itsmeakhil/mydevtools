from typing import Any, Optional

from fastapi import HTTPException, status
from pymongo.errors import PyMongoError

from app.api.routes.passwords.schema import (
    KeyVerifier,
    PasswordEntryCreate,
    PasswordEntryUpdate,
    PasswordEntryOut,
    VaultOut,
    VaultSetupRequest,
)
from app.utils.collection_name import PASSWORD_ENTRIES, PASSWORD_VAULTS
from app.utils.utils import create_timestamp, new_id
from app.database import db_manager



def _vault_doc_to_out(doc: dict[str, Any]) -> VaultOut:
    verifier_raw = doc.get("verifier") or {}
    salt = doc.get("salt")
    if not salt:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Vault salt missing.")

    verifier_enc = verifier_raw.get("encrypted")
    verifier_iv = verifier_raw.get("iv")
    if not verifier_enc or not verifier_iv:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Vault verifier missing.",
        )
    verifier = KeyVerifier(
        encrypted=str(verifier_enc),
        iv=str(verifier_iv),
    )
    created_at = int(doc.get("createdAt", 0))
    if created_at <= 0:
        created_at = create_timestamp()

    return VaultOut(
        salt=str(salt),
        verifier=verifier,
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


def get_vault(uid: str) -> VaultOut:
    doc = db_manager.find_one(PASSWORD_VAULTS, {"created_by": uid})
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vault not found.")
    return _vault_doc_to_out(doc)


def setup_vault(uid: str, body: VaultSetupRequest) -> VaultOut:
    ts_created = int(body.createdAt) if body.createdAt is not None else create_timestamp()
    ts_updated = create_timestamp()

    doc: dict[str, Any] = {
        "created_by": uid,
        "salt": body.salt,
        "verifier": {"encrypted": body.verifier.encrypted, "iv": body.verifier.iv},
        "createdAt": ts_created,
        "updatedAt": ts_updated,
    }

    try:
        db_manager.update_one(PASSWORD_VAULTS, {"created_by": uid}, doc, upsert=True)
    except PyMongoError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to setup vault.",
        ) from exc

    # Return the stored values (canonical createdAt).
    return get_vault(uid)


def list_entries(
    uid: str,
    *,
    limit: Optional[int] = None,
    offset: int = 0,
) -> list[PasswordEntryOut]:
    q = {"created_by": uid}
    cursor = db_manager.find(PASSWORD_ENTRIES, q, sort=[("updatedAt", -1), ("createdAt", -1)], skip=max(0, offset))
    if limit is not None:
        cursor = cursor.limit(limit)
    docs = list(cursor)
    out: list[PasswordEntryOut] = []
    for d in docs:
        eid = str(d.get("_id", "")) if d.get("_id") is not None else ""
        out.append(_entry_doc_to_out(d, entry_id=eid))
    return out


def create_entry(uid: str, body: PasswordEntryCreate) -> PasswordEntryOut:
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

    try:
        db_manager.insert_one(PASSWORD_ENTRIES, doc)
    except PyMongoError as exc:
        # Likely collision on _id; treat like conflict to keep consistent with other modules.
        msg = str(exc).lower()
        if "duplicate" in msg or "e11000" in msg:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Entry id collision.") from exc
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to create entry.") from exc

    return _entry_doc_to_out(doc, entry_id=eid)


def get_entry(uid: str, entry_id: str) -> PasswordEntryOut:
    doc = db_manager.find_one(PASSWORD_ENTRIES, {"_id": entry_id, "created_by": uid})
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Entry not found.")
    return _entry_doc_to_out(doc, entry_id=entry_id)


def update_entry(uid: str, entry_id: str, body: PasswordEntryUpdate) -> PasswordEntryOut:
    ts_updated = int(body.updatedAt) if body.updatedAt is not None else create_timestamp()

    patch: dict[str, Any] = {
        "encryptedData": body.encryptedData,
        "iv": body.iv,
        "updatedAt": ts_updated,
    }

    try:
        result = db_manager.update_one(PASSWORD_ENTRIES, {"_id": entry_id, "created_by": uid}, {"$set": patch})
    except PyMongoError as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to update entry.") from exc

    if result.matched_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Entry not found.")

    return get_entry(uid, entry_id)


def delete_entry(uid: str, entry_id: str) -> None:
    result = db_manager.delete_one(PASSWORD_ENTRIES, {"_id": entry_id, "created_by": uid})
    if result.deleted_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Entry not found.")


def clear_entries(uid: str) -> dict[str, int]:
    try:
        res = db_manager.delete_many(PASSWORD_ENTRIES, {"created_by": uid})
    except PyMongoError as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to clear entries.") from exc
    return {"entriesDeleted": int(res.deleted_count)}


def clear_vault(uid: str) -> dict[str, int]:
    # Delete entries first so references never “survive” vault deletion.
    entries_deleted = clear_entries(uid)["entriesDeleted"]
    try:
        res = db_manager.delete_many(PASSWORD_VAULTS, {"created_by": uid})
    except PyMongoError as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to clear vault.") from exc
    return {"entriesDeleted": entries_deleted, "vaultDeleted": int(res.deleted_count)}

