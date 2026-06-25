from typing import Any

from fastapi import HTTPException, status

from app.api.routes.api_key_vault.schema import (
    ApiKeyEntryCreate,
    ApiKeyEntryOut,
    ApiKeyEntryUpdate,
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


async def list_entries(uid: str, *, limit: int | None = None, offset: int = 0) -> list[ApiKeyEntryOut]:
    docs = await db_manager.find(
        API_KEY_VAULT_ENTRIES,
        {"created_by": uid},
        sort=[("updatedAt", -1), ("createdAt", -1)],
        skip=max(0, offset),
        limit=limit or 0,
    )
    return [_entry_doc_to_out(d, entry_id=str(d.get("_id", ""))) for d in docs]


async def create_entry(uid: str, body: ApiKeyEntryCreate) -> ApiKeyEntryOut:
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
    await safe_insert(API_KEY_VAULT_ENTRIES, doc, name="ApiKeyEntry")
    return _entry_doc_to_out(doc, entry_id=eid)


async def get_entry(uid: str, entry_id: str) -> ApiKeyEntryOut:
    doc = await db_manager.find_one(API_KEY_VAULT_ENTRIES, {"_id": entry_id, "created_by": uid})
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="API key entry not found.")
    return _entry_doc_to_out(doc, entry_id=entry_id)


async def update_entry(uid: str, entry_id: str, body: ApiKeyEntryUpdate) -> ApiKeyEntryOut:
    ts_updated = int(body.updatedAt) if body.updatedAt is not None else create_timestamp()
    patch: dict[str, Any] = {
        "encryptedData": body.encryptedData,
        "iv": body.iv,
        "updatedAt": ts_updated,
    }
    result = await safe_update_one(
        API_KEY_VAULT_ENTRIES,
        {"_id": entry_id, "created_by": uid},
        patch,
        name="ApiKeyEntry",
    )
    return _entry_doc_to_out(result, entry_id=entry_id)


async def delete_entry(uid: str, entry_id: str) -> None:
    await safe_delete_one(
        API_KEY_VAULT_ENTRIES, {"_id": entry_id, "created_by": uid}, name="ApiKeyEntry"
    )
