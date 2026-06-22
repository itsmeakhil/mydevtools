from fastapi import APIRouter, Depends, Query

from app.api.routes.auth.services import get_current_uid
from app.api.routes.user_preferences.schema import (
    NosqlQueryHistoryOut,
    NosqlQueryHistoryPut,
    ToolUsageTrackRequest,
    UserPreferencesOut,
    UserPreferencesUpdate,
)
from app.api.routes.user_preferences import services as pref_svc


router = APIRouter(prefix="/user-preferences", tags=["user-preferences"])


@router.get("", response_model=UserPreferencesOut, summary="Get user preferences")
async def get_prefs(uid: str = Depends(get_current_uid)) -> UserPreferencesOut:
    return await pref_svc.get_preferences(uid=uid)


@router.patch("", response_model=UserPreferencesOut, summary="Update user preferences (partial)")
async def patch_prefs(body: UserPreferencesUpdate, uid: str = Depends(get_current_uid)) -> UserPreferencesOut:
    return await pref_svc.patch_preferences(uid, body)


@router.post(
    "/tool-usage",
    summary="Increment per-tool usage count (authenticated analytics)",
)
async def track_tool_usage(body: ToolUsageTrackRequest, uid: str = Depends(get_current_uid)) -> dict[str, bool]:
    await pref_svc.track_tool_usage(uid, body.toolId)
    return {"ok": True}


@router.get(
    "/nosql-query-history",
    response_model=NosqlQueryHistoryOut,
    summary="Load NoSQL explorer query history for a collection context",
)
async def get_nosql_query_history(
    connection_name: str = Query(..., alias="connectionName"),
    db_name: str = Query(..., alias="dbName"),
    collection_name: str = Query(..., alias="collectionName"),
    uid: str = Depends(get_current_uid),
) -> NosqlQueryHistoryOut:
    return await pref_svc.get_nosql_query_history(
        uid,
        connection_name=connection_name,
        db_name=db_name,
        collection_name=collection_name,
    )


@router.put(
    "/nosql-query-history",
    response_model=NosqlQueryHistoryOut,
    summary="Replace NoSQL explorer query history (max 10 queries)",
)
async def put_nosql_query_history(body: NosqlQueryHistoryPut, uid: str = Depends(get_current_uid)) -> NosqlQueryHistoryOut:
    return await pref_svc.put_nosql_query_history(uid, body)
