from typing import Any

from fastapi import HTTPException, status

from app.api.routes.api_key_vault.schema import (
    ApiKeyEntryCreate,
    ApiKeyEntryOut,
    ApiKeyEntryUpdate,
)
from app.api.routes.workspaces.middleware import (
    WorkspaceContext,
    apply_legacy_or_filter,
    apply_workspace_filter,
)
from app.database import db_manager
from app.utils.collection_name import API_KEY_VAULT_ENTRIES
from app.utils.crud import safe_delete_one, safe_insert, safe_update_one
from app.utils.utils import create_timestamp, new_id


def _entry_doc_to_out(doc: dict[str, Any], *, entry_id: str) -> ApiKeyEntryOut:
    created_at = int(doc.get("createdAt", 0)) or create_timestamp()
    updated_at = int(doc.get("updatedAt", 0)) or created_at
    return ApiKeyEntryOut(
        id=entry_id,
        encryptedData=str(doc.get("encryptedData", "")),
        iv=str(doc.get("iv", "")),
        createdAt=created_at,
        updatedAt=updated_at,
    )


# ponytail: cache removed during workspace refactor; re-add with (workspace_id, uid) key if hot
async def list_entries(ctx: WorkspaceContext, *, limit: int | None = None, offset: int = 0) -> list[ApiKeyEntryOut]:
    flt = apply_legacy_or_filter(ctx, {}, user_field="created_by")
    docs = await db_manager.find(
        API_KEY_VAULT_ENTRIES,
        flt,
        sort=[("updatedAt", -1), ("createdAt", -1)],
        skip=max(0, offset),
        limit=limit or 0,
    )
    return [_entry_doc_to_out(d, entry_id=str(d.get("_id", ""))) for d in docs]


async def create_entry(ctx: WorkspaceContext, body: ApiKeyEntryCreate) -> ApiKeyEntryOut:
    eid = new_id()
    ts = create_timestamp()
    created_at = int(body.createdAt) if body.createdAt is not None else ts
    updated_at = int(body.updatedAt) if body.updatedAt is not None else created_at

    doc: dict[str, Any] = {
        "_id": eid,
        "created_by": ctx.uid,
        "workspace_id": ctx.workspace_id,
        "owner_uid": ctx.uid,
        "encryptedData": body.encryptedData,
        "iv": body.iv,
        "createdAt": created_at,
        "updatedAt": updated_at,
    }
    await safe_insert(API_KEY_VAULT_ENTRIES, doc, name="ApiKeyEntry")
    return _entry_doc_to_out(doc, entry_id=eid)


# ponytail: cache removed during workspace refactor; re-add with (workspace_id, uid) key if hot
async def get_entry(*, ctx: WorkspaceContext, entry_id: str) -> ApiKeyEntryOut:
    flt = apply_workspace_filter(ctx, {"_id": entry_id, "created_by": ctx.uid})
    doc = await db_manager.find_one(API_KEY_VAULT_ENTRIES, flt)
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="API key entry not found.")
    return _entry_doc_to_out(doc, entry_id=entry_id)


async def update_entry(ctx: WorkspaceContext, entry_id: str, body: ApiKeyEntryUpdate) -> ApiKeyEntryOut:
    ts_updated = int(body.updatedAt) if body.updatedAt is not None else create_timestamp()
    patch: dict[str, Any] = {
        "encryptedData": body.encryptedData,
        "iv": body.iv,
        "updatedAt": ts_updated,
    }
    flt = apply_workspace_filter(ctx, {"_id": entry_id, "created_by": ctx.uid})
    result = await safe_update_one(
        API_KEY_VAULT_ENTRIES,
        flt,
        patch,
        name="ApiKeyEntry",
    )
    return _entry_doc_to_out(result, entry_id=entry_id)


async def delete_entry(ctx: WorkspaceContext, entry_id: str) -> None:
    flt = apply_workspace_filter(ctx, {"_id": entry_id, "created_by": ctx.uid})
    await safe_delete_one(
        API_KEY_VAULT_ENTRIES, flt, name="ApiKeyEntry"
    )
