import time
from typing import Any

from fastapi import HTTPException, status

try:
    from pymongo.collection import Collection
    from pymongo.errors import PyMongoError
except Exception:  # pragma: no cover
    Collection = Any  # type: ignore
    PyMongoError = Exception  # type: ignore

from app.api.routes.user_preferences.schema import UserPreferencesOut, UserPreferencesUpdate
from app.core.db import get_db
from app.utils.collection_name import USER_PREFERENCES


def now_ms() -> int:
    return int(time.time() * 1000)


def _prefs_col() -> Collection:
    return get_db()[USER_PREFERENCES]


def _doc_to_out(doc: dict[str, Any]) -> UserPreferencesOut:
    created_at = int(doc.get("createdAt", 0)) or now_ms()
    updated_at = int(doc.get("updatedAt", 0)) or created_at
    return UserPreferencesOut(
        theme=doc.get("theme") or "system",
        accentColor=doc.get("accentColor") or "blue",
        locale=doc.get("locale") or "en",
        createdAt=created_at,
        updatedAt=updated_at,
    )


def get_preferences(uid: str) -> UserPreferencesOut:
    doc = _prefs_col().find_one({"created_by": uid})
    if not doc:
        # Return defaults (not creating a DB write on read).
        ts = now_ms()
        return UserPreferencesOut(createdAt=ts, updatedAt=ts)
    return _doc_to_out(doc)


def patch_preferences(uid: str, body: UserPreferencesUpdate) -> UserPreferencesOut:
    patch = body.model_dump(exclude_unset=True)
    patch.pop("createdAt", None)
    patch.pop("updatedAt", None)
    ts = now_ms()
    patch["updatedAt"] = ts

    try:
        existing = _prefs_col().find_one({"created_by": uid})
        if not existing:
            doc = {
                "_id": uid,  # stable one-doc-per-user
                "created_by": uid,
                "createdAt": ts,
                "updatedAt": ts,
                "theme": "system",
                "accentColor": "blue",
                "locale": "en",
            }
            doc.update({k: v for k, v in patch.items() if v is not None})
            _prefs_col().insert_one(doc)
            return _doc_to_out(doc)

        _prefs_col().update_one({"created_by": uid}, {"$set": patch})
        updated = _prefs_col().find_one({"created_by": uid})
        if not updated:
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Preferences missing.")
        return _doc_to_out(updated)
    except PyMongoError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update preferences.",
        ) from exc

