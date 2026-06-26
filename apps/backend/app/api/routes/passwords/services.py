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
from app.api.routes.workspaces.middleware import (
    WorkspaceContext,
    apply_legacy_or_filter,
    apply_workspace_filter,
)
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


# ponytail: cache removed during workspace refactor; re-add with (workspace_id, uid) key if hot
async def get_vault(*, ctx: WorkspaceContext) -> VaultOut:
    flt = apply_legacy_or_filter(ctx, {}, user_field="created_by")
    doc = await db_manager.find_one(PASSWORD_VAULTS, flt)
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vault not found.")
    return _vault_doc_to_out(doc)


async def setup_vault(ctx: WorkspaceContext, body: VaultSetupRequest) -> VaultOut:
    flt = apply_legacy_or_filter(ctx, {}, user_field="created_by")
    existing = await db_manager.find_one(PASSWORD_VAULTS, flt)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Vault already exists. Delete the existing vault first.",
        )

    ts_created = int(body.createdAt) if body.createdAt is not None else create_timestamp()
    ts_updated = create_timestamp()

    doc: dict[str, Any] = {
        "created_by": ctx.uid,
        "org_id": ctx.org_id,
        "workspace_id": ctx.workspace_id,
        "owner_uid": ctx.uid,
        "salt": body.salt,
        "verifier": {"encrypted": body.verifier.encrypted, "iv": body.verifier.iv},
        "createdAt": ts_created,
        "updatedAt": ts_updated,
    }
    await safe_insert(PASSWORD_VAULTS, doc, name="Vault")
    return await get_vault(ctx=ctx)


# ponytail: cache removed during workspace refactor; re-add with (workspace_id, uid) key if hot
async def list_entries(*, ctx: WorkspaceContext, limit: int = 200, offset: int = 0) -> list[PasswordEntryOut]:
    flt = apply_legacy_or_filter(ctx, {}, user_field="created_by")
    docs = await db_manager.find(
        PASSWORD_ENTRIES,
        flt,
        sort=[("updatedAt", -1), ("createdAt", -1)],
        skip=max(0, offset),
        limit=max(1, limit),
    )
    return [_entry_doc_to_out(d, entry_id=str(d.get("_id", ""))) for d in docs]


async def create_entry(ctx: WorkspaceContext, body: PasswordEntryCreate) -> PasswordEntryOut:
    eid = new_id()
    ts = create_timestamp()
    created_at = int(body.createdAt) if body.createdAt is not None else ts
    updated_at = int(body.updatedAt) if body.updatedAt is not None else created_at

    doc: dict[str, Any] = {
        "_id": eid,
        "created_by": ctx.uid,
        "org_id": ctx.org_id,
        "workspace_id": ctx.workspace_id,
        "owner_uid": ctx.uid,
        "encryptedData": body.encryptedData,
        "iv": body.iv,
        "createdAt": created_at,
        "updatedAt": updated_at,
    }
    await safe_insert(PASSWORD_ENTRIES, doc, name="Entry")
    return _entry_doc_to_out(doc, entry_id=eid)


# ponytail: cache removed during workspace refactor; re-add with (workspace_id, uid) key if hot
async def get_entry(*, ctx: WorkspaceContext, entry_id: str) -> PasswordEntryOut:
    flt = apply_workspace_filter(ctx, {"_id": entry_id, "created_by": ctx.uid})
    doc = await db_manager.find_one(PASSWORD_ENTRIES, flt)
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Entry not found.")
    return _entry_doc_to_out(doc, entry_id=entry_id)


async def update_entry(ctx: WorkspaceContext, entry_id: str, body: PasswordEntryUpdate) -> PasswordEntryOut:
    ts_updated = int(body.updatedAt) if body.updatedAt is not None else create_timestamp()
    patch: dict[str, Any] = {
        "encryptedData": body.encryptedData,
        "iv": body.iv,
        "updatedAt": ts_updated,
    }
    flt = apply_workspace_filter(ctx, {"_id": entry_id, "created_by": ctx.uid})
    doc = await safe_update_one(
        PASSWORD_ENTRIES,
        flt,
        patch,
        name="Entry",
    )
    return _entry_doc_to_out(doc, entry_id=entry_id)


async def delete_entry(ctx: WorkspaceContext, entry_id: str) -> None:
    flt = apply_workspace_filter(ctx, {"_id": entry_id, "created_by": ctx.uid})
    await safe_delete_one(PASSWORD_ENTRIES, flt, name="Entry")


async def clear_entries(ctx: WorkspaceContext) -> dict[str, int]:
    flt = apply_workspace_filter(ctx, {"created_by": ctx.uid})
    try:
        res = await db_manager.delete_many(PASSWORD_ENTRIES, flt)
    except PyMongoError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to clear entries."
        ) from exc
    return {"entriesDeleted": int(res.deleted_count)}


async def clear_vault(ctx: WorkspaceContext) -> dict[str, int]:
    entries_deleted = (await clear_entries(ctx))["entriesDeleted"]
    flt = apply_workspace_filter(ctx, {"created_by": ctx.uid})
    try:
        res = await db_manager.delete_many(PASSWORD_VAULTS, flt)
    except PyMongoError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to clear vault."
        ) from exc
    return {"entriesDeleted": entries_deleted, "vaultDeleted": int(res.deleted_count)}
