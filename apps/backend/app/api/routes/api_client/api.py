from fastapi import APIRouter, Depends

from app.api.routes.auth.services import get_current_uid
from app.api.routes.api_client import services as api_client_svc
from app.api.routes.api_client.schema import (
    ApiClientCollectionCreate,
    ApiClientCollectionOut,
    ApiClientCollectionUpdate,
    ApiClientEnvironmentCreate,
    ApiClientEnvironmentOut,
    ApiClientEnvironmentUpdate,
)


router = APIRouter(prefix="/api-client", tags=["api-client"])


@router.get("/collections", response_model=list[ApiClientCollectionOut], summary="List API client collections")
def list_collections(uid: str = Depends(get_current_uid)) -> list[ApiClientCollectionOut]:
    return api_client_svc.list_collections(uid)


@router.post("/collections", response_model=ApiClientCollectionOut, summary="Create API client collection")
def create_collection(
    body: ApiClientCollectionCreate,
    uid: str = Depends(get_current_uid),
) -> ApiClientCollectionOut:
    return api_client_svc.create_collection(uid, body)


@router.patch(
    "/collections/{collection_id}",
    response_model=ApiClientCollectionOut,
    summary="Update API client collection (partial)",
)
def patch_collection(
    collection_id: str,
    body: ApiClientCollectionUpdate,
    uid: str = Depends(get_current_uid),
) -> ApiClientCollectionOut:
    return api_client_svc.patch_collection(uid, collection_id, body)


@router.delete("/collections/{collection_id}", status_code=204, summary="Delete API client collection")
def delete_collection(collection_id: str, uid: str = Depends(get_current_uid)) -> None:
    api_client_svc.delete_collection(uid, collection_id)


@router.get("/environments", response_model=list[ApiClientEnvironmentOut], summary="List API client environments")
def list_environments(uid: str = Depends(get_current_uid)) -> list[ApiClientEnvironmentOut]:
    return api_client_svc.list_environments(uid)


@router.post("/environments", response_model=ApiClientEnvironmentOut, summary="Create API client environment")
def create_environment(
    body: ApiClientEnvironmentCreate,
    uid: str = Depends(get_current_uid),
) -> ApiClientEnvironmentOut:
    return api_client_svc.create_environment(uid, body)


@router.patch(
    "/environments/{environment_id}",
    response_model=ApiClientEnvironmentOut,
    summary="Update API client environment (partial)",
)
def patch_environment(
    environment_id: str,
    body: ApiClientEnvironmentUpdate,
    uid: str = Depends(get_current_uid),
) -> ApiClientEnvironmentOut:
    return api_client_svc.patch_environment(uid, environment_id, body)


@router.delete("/environments/{environment_id}", status_code=204, summary="Delete API client environment")
def delete_environment(environment_id: str, uid: str = Depends(get_current_uid)) -> None:
    api_client_svc.delete_environment(uid, environment_id)

