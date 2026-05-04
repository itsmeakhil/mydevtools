from typing import Any, Optional

from fastapi import HTTPException, status
from pymongo.errors import PyMongoError

from app.api.routes.environment_manager.schema import (
    EnvSetEntryCreate,
    EnvSetEntryOut,
    EnvSetEntryUpdate,
)
from app.utils.collection_name import ENV_MANAGER_ENTRIES
from app.utils.utils import create_timestamp, is_duplicate_key_error, new_id
from app.database import db_manager


def _entry_doc_to_out(doc: dict[str, Any], *, entry_id: str) -> EnvSetEntryOut:
    created_at = int(doc.get("createdAt", 0)) or create_timestamp()
    updated_at = int(doc.get("updatedAt", 0)) or created_at
    return EnvSetEntryOut(
        id=entry_id,
        encryptedData=str(doc.get("encryptedData", "")),
        iv=str(doc.get("iv", "")),
        createdAt=created_at,
        updatedAt=updated_at,
    )


async def list_entries(uid: str, *, limit: Optional[int] = None, offset: int = 0) -> list[EnvSetEntryOut]:
    docs = await db_manager.find(
        ENV_MANAGER_ENTRIES,
        {"created_by": uid},
        sort=[("updatedAt", -1), ("createdAt", -1)],
        skip=max(0, offset),
        limit=limit or 0,
    )
    return [_entry_doc_to_out(d, entry_id=str(d.get("_id", ""))) for d in docs]


async def create_entry(uid: str, body: EnvSetEntryCreate) -> EnvSetEntryOut:
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
        await db_manager.insert_one(ENV_MANAGER_ENTRIES, doc)
    except PyMongoError as exc:
        if is_duplicate_key_error(exc):
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Entry id collision.") from exc
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to create entry."
        ) from exc

    return _entry_doc_to_out(doc, entry_id=eid)


async def get_entry(uid: str, entry_id: str) -> EnvSetEntryOut:
    doc = await db_manager.find_one(ENV_MANAGER_ENTRIES, {"_id": entry_id, "created_by": uid})
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Entry not found.")
    return _entry_doc_to_out(doc, entry_id=entry_id)


async def update_entry(uid: str, entry_id: str, body: EnvSetEntryUpdate) -> EnvSetEntryOut:
    ts_updated = int(body.updatedAt) if body.updatedAt is not None else create_timestamp()
    patch: dict[str, Any] = {
        "encryptedData": body.encryptedData,
        "iv": body.iv,
        "updatedAt": ts_updated,
    }
    try:
        result = await db_manager.update_one(
            ENV_MANAGER_ENTRIES, {"_id": entry_id, "created_by": uid}, {"$set": patch}
        )
    except PyMongoError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to update entry."
        ) from exc

    if result.matched_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Entry not found.")
    return await get_entry(uid, entry_id)


async def delete_entry(uid: str, entry_id: str) -> None:
    result = await db_manager.delete_one(ENV_MANAGER_ENTRIES, {"_id": entry_id, "created_by": uid})
    if result.deleted_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Entry not found.")
