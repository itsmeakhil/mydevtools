from fastapi import APIRouter, Depends, Query

from app.api.routes.auth.services import get_current_uid
from app.api.routes.api_key_vault import services as vault_svc
from app.api.routes.api_key_vault.schema import (
    ApiKeyEntryCreate,
    ApiKeyEntryOut,
    ApiKeyEntryUpdate,
)

router = APIRouter(prefix="/api-keys", tags=["api-keys"])


@router.get(
    "/entries",
    response_model=list[ApiKeyEntryOut],
    summary="List encrypted API key entries",
)
async def list_entries(
    uid: str = Depends(get_current_uid),
    limit: int | None = Query(default=None, ge=1, le=1000),
    offset: int = Query(default=0, ge=0),
) -> list[ApiKeyEntryOut]:
    return await vault_svc.list_entries(uid, limit=limit, offset=offset)


@router.post(
    "/entries",
    response_model=ApiKeyEntryOut,
    summary="Create API key entry (encrypted blob)",
)
async def create_entry(body: ApiKeyEntryCreate, uid: str = Depends(get_current_uid)) -> ApiKeyEntryOut:
    return await vault_svc.create_entry(uid, body)


@router.get(
    "/entries/{entry_id}",
    response_model=ApiKeyEntryOut,
    summary="Get one API key entry",
)
async def get_entry(entry_id: str, uid: str = Depends(get_current_uid)) -> ApiKeyEntryOut:
    return await vault_svc.get_entry(uid, entry_id)


@router.patch(
    "/entries/{entry_id}",
    response_model=ApiKeyEntryOut,
    summary="Update API key entry (encrypted blob)",
)
async def patch_entry(
    entry_id: str,
    body: ApiKeyEntryUpdate,
    uid: str = Depends(get_current_uid),
) -> ApiKeyEntryOut:
    return await vault_svc.update_entry(uid, entry_id, body)


@router.delete(
    "/entries/{entry_id}",
    status_code=204,
    summary="Delete API key entry",
)
async def delete_entry(entry_id: str, uid: str = Depends(get_current_uid)) -> None:
    await vault_svc.delete_entry(uid, entry_id)
