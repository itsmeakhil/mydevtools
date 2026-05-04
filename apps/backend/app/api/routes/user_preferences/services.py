import time
from datetime import datetime, timezone
from typing import Any

from fastapi import HTTPException, status
from pymongo.errors import PyMongoError

from app.api.routes.user_preferences.schema import (
    DEFAULT_ENABLED_TOOLS,
    MAX_NOSQL_HISTORY_QUERIES,
    NosqlQueryHistoryOut,
    NosqlQueryHistoryPut,
    ToolStatOut,
    UserPreferencesOut,
    UserPreferencesUpdate,
)
from app.database import db_manager
from app.utils.collection_name import NOSQL_QUERY_HISTORY, USER_PREFERENCES
from app.utils.utils import create_timestamp


def _iso_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def _tool_stats_list_to_dict(raw: Any) -> dict[str, ToolStatOut]:
    if not isinstance(raw, list):
        return {}
    out: dict[str, ToolStatOut] = {}
    for item in raw:
        if not isinstance(item, dict):
            continue
        tid = item.get("toolId")
        if not tid or not isinstance(tid, str):
            continue
        out[tid] = ToolStatOut(
            usageCount=int(item.get("usageCount", 0) or 0),
            lastUsed=str(item.get("lastUsed", "") or ""),
        )
    return out


def _tool_stats_dict_to_list(d: dict[str, ToolStatOut]) -> list[dict[str, Any]]:
    return [
        {"toolId": k, "usageCount": v.usageCount, "lastUsed": v.lastUsed}
        for k, v in sorted(d.items(), key=lambda kv: kv[0])
    ]


def _default_prefs_doc(uid: str, ts: int) -> dict[str, Any]:
    return {
        "_id": uid,
        "created_by": uid,
        "createdAt": ts,
        "updatedAt": ts,
        "theme": "system",
        "accentColor": "blue",
        "locale": "en",
        "enabledTools": list(DEFAULT_ENABLED_TOOLS),
        "toolFavorites": [],
        "toolStatsList": [],
    }


def _doc_to_out(doc: dict[str, Any]) -> UserPreferencesOut:
    created_at = int(doc.get("createdAt", 0)) or create_timestamp()
    updated_at = int(doc.get("updatedAt", 0)) or created_at
    raw_enabled = doc.get("enabledTools")
    if raw_enabled is None or not isinstance(raw_enabled, list):
        enabled = list(DEFAULT_ENABLED_TOOLS)
    else:
        enabled = [str(x) for x in raw_enabled]
    favs = doc.get("toolFavorites")
    if not isinstance(favs, list):
        favs = []
    stats = _tool_stats_list_to_dict(doc.get("toolStatsList"))
    return UserPreferencesOut(
        theme=doc.get("theme") or "system",
        accentColor=doc.get("accentColor") or "blue",
        locale=doc.get("locale") or "en",
        enabledTools=enabled,
        toolFavorites=[str(x) for x in favs],
        toolStats=stats,
        createdAt=created_at,
        updatedAt=updated_at,
    )


async def get_preferences(uid: str) -> UserPreferencesOut:
    doc = await db_manager.find_one(USER_PREFERENCES, {"created_by": uid})
    if not doc:
        ts = create_timestamp()
        return _doc_to_out(_default_prefs_doc(uid, ts))
    return _doc_to_out(doc)


async def patch_preferences(uid: str, body: UserPreferencesUpdate) -> UserPreferencesOut:
    patch = body.model_dump(exclude_unset=True)
    patch.pop("createdAt", None)
    patch.pop("updatedAt", None)

    ts = create_timestamp()
    set_fields: dict[str, Any] = {"updatedAt": ts}

    if "toolStats" in patch and patch["toolStats"] is not None:
        stats_dict = {k: ToolStatOut.model_validate(v) for k, v in patch["toolStats"].items()}
        set_fields["toolStatsList"] = _tool_stats_dict_to_list(stats_dict)
        del patch["toolStats"]

    for key in ("enabledTools", "toolFavorites"):
        if key in patch and patch[key] is not None:
            set_fields[key] = patch[key]
            del patch[key]

    set_fields.update({k: v for k, v in patch.items() if v is not None})

    try:
        existing = await db_manager.find_one(USER_PREFERENCES, {"created_by": uid})
        if not existing:
            doc = _default_prefs_doc(uid, ts)
            for k, v in set_fields.items():
                if k != "updatedAt":
                    doc[k] = v
            doc["updatedAt"] = ts
            await db_manager.insert_one(USER_PREFERENCES, doc)
            return _doc_to_out(doc)

        await db_manager.update_one(USER_PREFERENCES, {"created_by": uid}, {"$set": set_fields})
        updated = await db_manager.find_one(USER_PREFERENCES, {"created_by": uid})
        if not updated:
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Preferences missing.")
        return _doc_to_out(updated)
    except PyMongoError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to update preferences."
        ) from exc


async def track_tool_usage(uid: str, tool_id: str) -> None:
    ts = create_timestamp()
    now_iso = _iso_now()

    try:
        doc = await db_manager.find_one(USER_PREFERENCES, {"created_by": uid})
        if not doc:
            new_doc = _default_prefs_doc(uid, ts)
            new_doc["toolStatsList"] = [{"toolId": tool_id, "usageCount": 1, "lastUsed": now_iso}]
            await db_manager.insert_one(USER_PREFERENCES, new_doc)
            return

        stats_list = list(doc.get("toolStatsList") or [])
        found = False
        for i, item in enumerate(stats_list):
            if isinstance(item, dict) and item.get("toolId") == tool_id:
                stats_list[i] = {
                    "toolId": tool_id,
                    "usageCount": int(item.get("usageCount", 0) or 0) + 1,
                    "lastUsed": now_iso,
                }
                found = True
                break
        if not found:
            stats_list.append({"toolId": tool_id, "usageCount": 1, "lastUsed": now_iso})

        await db_manager.update_one(
            USER_PREFERENCES,
            {"created_by": uid},
            {"$set": {"toolStatsList": stats_list, "updatedAt": ts}},
        )
    except PyMongoError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to track tool usage."
        ) from exc


def _history_filter(uid: str, connection_name: str, db_name: str, collection_name: str) -> dict[str, Any]:
    return {
        "created_by": uid,
        "connectionName": connection_name,
        "dbName": db_name,
        "collectionName": collection_name,
    }


async def get_nosql_query_history(
    uid: str, *, connection_name: str, db_name: str, collection_name: str
) -> NosqlQueryHistoryOut:
    doc = await db_manager.find_one(
        NOSQL_QUERY_HISTORY, _history_filter(uid, connection_name, db_name, collection_name)
    )
    if not doc:
        return NosqlQueryHistoryOut(
            connectionName=connection_name,
            dbName=db_name,
            collectionName=collection_name,
            queries=[],
            updatedAt=create_timestamp(),
        )
    queries = doc.get("queries") or []
    if not isinstance(queries, list):
        queries = []
    return NosqlQueryHistoryOut(
        connectionName=connection_name,
        dbName=db_name,
        collectionName=collection_name,
        queries=[str(q) for q in queries][:MAX_NOSQL_HISTORY_QUERIES],
        updatedAt=int(doc.get("updatedAt", 0)) or create_timestamp(),
    )


async def put_nosql_query_history(uid: str, body: NosqlQueryHistoryPut) -> NosqlQueryHistoryOut:
    ts = create_timestamp()
    queries = body.queries[:MAX_NOSQL_HISTORY_QUERIES]
    flt = _history_filter(uid, body.connectionName, body.dbName, body.collectionName)
    doc = {**flt, "queries": queries, "updatedAt": ts}

    try:
        existing = await db_manager.find_one(NOSQL_QUERY_HISTORY, flt)
        if not existing:
            doc["createdAt"] = ts
            await db_manager.insert_one(NOSQL_QUERY_HISTORY, doc)
        else:
            await db_manager.update_one(
                NOSQL_QUERY_HISTORY, flt, {"$set": {"queries": queries, "updatedAt": ts}}
            )
        return await get_nosql_query_history(
            uid,
            connection_name=body.connectionName,
            db_name=body.dbName,
            collection_name=body.collectionName,
        )
    except PyMongoError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to save query history."
        ) from exc
