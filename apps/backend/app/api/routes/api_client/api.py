from fastapi import APIRouter, BackgroundTasks, Depends, Query

from app.api.routes.api_client import collections_delta
from app.api.routes.api_client import services as api_client_svc
from app.api.routes.api_client.schema import (
    HISTORY_MAX_ITEMS,
    ApiClientCollectionCreate,
    ApiClientCollectionOut,
    ApiClientCollectionUpdate,
    ApiClientEnvironmentCreate,
    ApiClientEnvironmentOut,
    ApiClientEnvironmentUpdate,
    ApiClientHistoryCreate,
    ApiClientHistoryOut,
    ApiClientPublicMockOut,
    ApiClientPublicMockPublish,
    ApiClientWorkspaceCreate,
    ApiClientWorkspaceOut,
    ApiClientWorkspaceUpdate,
)
from app.api.routes.auth.services import get_current_uid

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


# ── Public mocks ─────────────────────────────────────────────────────────────


@router.get(
    "/public-mocks",
    response_model=list[ApiClientPublicMockOut],
    summary="List the caller's published public mocks",
)
async def list_public_mocks(uid: str = Depends(get_current_uid)) -> list[ApiClientPublicMockOut]:
    return await api_client_svc.list_public_mocks(uid=uid)


@router.post(
    "/public-mocks",
    response_model=ApiClientPublicMockOut,
    summary="Publish a snapshot of a collection as an anonymously-readable mock",
)
async def publish_public_mock(
    body: ApiClientPublicMockPublish,
    uid: str = Depends(get_current_uid),
) -> ApiClientPublicMockOut:
    return await api_client_svc.publish_public_mock(uid, body)


@router.delete(
    "/public-mocks/{mock_id}",
    status_code=204,
    summary="Unpublish a public mock",
)
async def delete_public_mock(mock_id: str, uid: str = Depends(get_current_uid)) -> None:
    await api_client_svc.delete_public_mock(uid, mock_id)


@router.get(
    "/public-mock/{mock_id}",
    response_model=ApiClientPublicMockOut,
    summary="Fetch a public mock by id — no auth required",
)
async def get_public_mock_anonymous(mock_id: str) -> ApiClientPublicMockOut:
    mock = await api_client_svc.get_public_mock_anonymous(mock_id)
    if not mock:
        from fastapi import HTTPException, status

        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Public mock not found.")
    return mock


# ── Workspaces ───────────────────────────────────────────────────────────────


@router.get(
    "/workspaces",
    response_model=list[ApiClientWorkspaceOut],
    summary="List the caller's workspaces",
)
async def list_workspaces(uid: str = Depends(get_current_uid)) -> list[ApiClientWorkspaceOut]:
    return await api_client_svc.list_workspaces(uid=uid)


@router.post(
    "/workspaces",
    response_model=ApiClientWorkspaceOut,
    summary="Create a workspace",
)
async def create_workspace(
    body: ApiClientWorkspaceCreate,
    uid: str = Depends(get_current_uid),
) -> ApiClientWorkspaceOut:
    return await api_client_svc.create_workspace(uid, body)


@router.patch(
    "/workspaces/{workspace_id}",
    response_model=ApiClientWorkspaceOut,
    summary="Rename a workspace",
)
async def patch_workspace(
    workspace_id: str,
    body: ApiClientWorkspaceUpdate,
    uid: str = Depends(get_current_uid),
) -> ApiClientWorkspaceOut:
    return await api_client_svc.patch_workspace(uid, workspace_id, body)


@router.delete(
    "/workspaces/{workspace_id}",
    status_code=204,
    summary="Delete a workspace (collections reset to default)",
)
async def delete_workspace(workspace_id: str, uid: str = Depends(get_current_uid)) -> None:
    await api_client_svc.delete_workspace(uid, workspace_id)
