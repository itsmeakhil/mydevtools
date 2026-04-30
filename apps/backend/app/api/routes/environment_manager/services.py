from typing import Any, Optional

from fastapi import HTTPException, status
from pymongo.errors import PyMongoError

from app.api.routes.environment_manager.schema import (
    EnvSetEntryCreate,
    EnvSetEntryOut,
    EnvSetEntryUpdate,
)
from app.utils.collection_name import ENV_MANAGER_ENTRIES
from app.utils.utils import create_timestamp, new_id
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


def list_entries(
    uid: str,
    *,
    limit: Optional[int] = None,
    offset: int = 0,
) -> list[EnvSetEntryOut]:
    q = {"created_by": uid}
    if limit is not None:
        cursor = db_manager.find(ENV_MANAGER_ENTRIES, q, sort=[("updatedAt", -1), ("createdAt", -1)], skip=max(0, offset), limit=limit)
    else:
        cursor = db_manager.find(ENV_MANAGER_ENTRIES, q, sort=[("updatedAt", -1), ("createdAt", -1)], skip=max(0, offset))
    docs = list(cursor)
    out: list[EnvSetEntryOut] = []
    for d in docs:
        eid = str(d.get("_id", "")) if d.get("_id") is not None else ""
        out.append(_entry_doc_to_out(d, entry_id=eid))
    return out


def create_entry(uid: str, body: EnvSetEntryCreate) -> EnvSetEntryOut:
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
        db_manager.insert_one(ENV_MANAGER_ENTRIES, doc)
    except PyMongoError as exc:
        msg = str(exc).lower()
        if "duplicate" in msg or "e11000" in msg:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Entry id collision.") from exc
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create entry.",
        ) from exc

    return _entry_doc_to_out(doc, entry_id=eid)


def get_entry(uid: str, entry_id: str) -> EnvSetEntryOut:
    doc = db_manager.find_one(ENV_MANAGER_ENTRIES, {"_id": entry_id, "created_by": uid})
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Entry not found.")
    return _entry_doc_to_out(doc, entry_id=entry_id)


def update_entry(uid: str, entry_id: str, body: EnvSetEntryUpdate) -> EnvSetEntryOut:
    ts_updated = int(body.updatedAt) if body.updatedAt is not None else create_timestamp()

    patch: dict[str, Any] = {
        "encryptedData": body.encryptedData,
        "iv": body.iv,
        "updatedAt": ts_updated,
    }

    try:
        result = db_manager.update_one(ENV_MANAGER_ENTRIES, {"_id": entry_id, "created_by": uid}, {"$set": patch})
    except PyMongoError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update entry.",
        ) from exc

    if result.matched_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Entry not found.")

    return get_entry(uid, entry_id)


def delete_entry(uid: str, entry_id: str) -> None:
    result = db_manager.delete_one(ENV_MANAGER_ENTRIES, {"_id": entry_id, "created_by": uid})
    if result.deleted_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Entry not found.")
