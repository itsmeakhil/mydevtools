from fastapi import APIRouter, BackgroundTasks, Depends, Query

from app.api.routes.auth.services import get_current_uid
from app.api.routes.api_client import services as api_client_svc
from app.api.routes.api_client.schema import (
    ApiClientCollectionCreate,
    ApiClientCollectionOut,
    ApiClientCollectionUpdate,
    ApiClientEnvironmentCreate,
    ApiClientEnvironmentOut,
    ApiClientEnvironmentUpdate,
    ApiClientHistoryCreate,
    ApiClientHistoryOut,
    HISTORY_MAX_ITEMS,
)
from app.api.routes.api_client import collections_delta


router = APIRouter(prefix="/api-client", tags=["api-client"])
router.include_router(collections_delta.router)


@router.get("/collections", response_model=list[ApiClientCollectionOut], summary="List API client collections")
async def list_collections(uid: str = Depends(get_current_uid)) -> list[ApiClientCollectionOut]:
    return await api_client_svc.list_collections(uid=uid)


@router.post("/collections", response_model=ApiClientCollectionOut, summary="Create API client collection")
async def create_collection(
    body: ApiClientCollectionCreate,
    uid: str = Depends(get_current_uid),
) -> ApiClientCollectionOut:
    return await api_client_svc.create_collection(uid, body)


@router.patch(
    "/collections/{collection_id}",
    response_model=ApiClientCollectionOut,
    summary="Update API client collection (partial)",
)
async def patch_collection(
    collection_id: str,
    body: ApiClientCollectionUpdate,
    uid: str = Depends(get_current_uid),
) -> ApiClientCollectionOut:
    return await api_client_svc.patch_collection(uid, collection_id, body)


@router.delete("/collections/{collection_id}", status_code=204, summary="Delete API client collection")
async def delete_collection(collection_id: str, uid: str = Depends(get_current_uid)) -> None:
    await api_client_svc.delete_collection(uid, collection_id)


@router.get("/environments", response_model=list[ApiClientEnvironmentOut], summary="List API client environments")
async def list_environments(uid: str = Depends(get_current_uid)) -> list[ApiClientEnvironmentOut]:
    return await api_client_svc.list_environments(uid=uid)


@router.post("/environments", response_model=ApiClientEnvironmentOut, summary="Create API client environment")
async def create_environment(
    body: ApiClientEnvironmentCreate,
    uid: str = Depends(get_current_uid),
) -> ApiClientEnvironmentOut:
    return await api_client_svc.create_environment(uid, body)


@router.patch(
    "/environments/{environment_id}",
    response_model=ApiClientEnvironmentOut,
    summary="Update API client environment (partial)",
)
async def patch_environment(
    environment_id: str,
    body: ApiClientEnvironmentUpdate,
    uid: str = Depends(get_current_uid),
) -> ApiClientEnvironmentOut:
    return await api_client_svc.patch_environment(uid, environment_id, body)


@router.delete("/environments/{environment_id}", status_code=204, summary="Delete API client environment")
async def delete_environment(environment_id: str, uid: str = Depends(get_current_uid)) -> None:
    await api_client_svc.delete_environment(uid, environment_id)


@router.get("/history", response_model=list[ApiClientHistoryOut], summary="List API client request history")
async def list_history(
    uid: str = Depends(get_current_uid),
    limit: int = Query(default=HISTORY_MAX_ITEMS, ge=1, le=HISTORY_MAX_ITEMS),
) -> list[ApiClientHistoryOut]:
    return await api_client_svc.list_history(uid=uid, limit=limit)


@router.post("/history", response_model=ApiClientHistoryOut, summary="Append API client history entry")
async def create_history(
    body: ApiClientHistoryCreate,
    background_tasks: BackgroundTasks,
    uid: str = Depends(get_current_uid),
) -> ApiClientHistoryOut:
    entry = await api_client_svc.create_history(uid, body)
    background_tasks.add_task(api_client_svc.trim_history, uid)
    return entry


@router.delete("/history/clear", status_code=204, summary="Clear all API client history")
async def clear_history(uid: str = Depends(get_current_uid)) -> None:
    await api_client_svc.clear_history(uid)


@router.delete("/history/{entry_id}", status_code=204, summary="Delete one history entry")
async def delete_history_entry(entry_id: str, uid: str = Depends(get_current_uid)) -> None:
    await api_client_svc.delete_history_entry(uid, entry_id)
