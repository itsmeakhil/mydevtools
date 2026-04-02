from typing import Optional

from fastapi import APIRouter, Depends, Query

from app.api.routes.auth.services import get_current_uid
from app.api.routes.passwords.schema import (
    PasswordEntryCreate,
    PasswordEntryOut,
    PasswordEntryUpdate,
    VaultOut,
    VaultSetupRequest,
)
from app.api.routes.passwords import services as pw_svc


router = APIRouter(prefix="/password-manager", tags=["password-manager"])


@router.get("/vault", response_model=VaultOut, summary="Get password vault settings")
def get_vault(uid: str = Depends(get_current_uid)) -> VaultOut:
    return pw_svc.get_vault(uid)


@router.post("/vault/setup", response_model=VaultOut, summary="Setup/replace password vault")
def setup_vault(body: VaultSetupRequest, uid: str = Depends(get_current_uid)) -> VaultOut:
    return pw_svc.setup_vault(uid, body)


@router.post(
    "/vault/clear",
    summary="Delete vault + all encrypted entries (clearAll equivalent)",
)
def clear_vault(uid: str = Depends(get_current_uid)) -> dict[str, int]:
    return pw_svc.clear_vault(uid)


@router.get(
    "/entries",
    response_model=list[PasswordEntryOut],
    summary="List encrypted password entries",
)
def list_entries(
    uid: str = Depends(get_current_uid),
    limit: Optional[int] = Query(default=None, ge=1, le=1000),
    offset: int = Query(default=0, ge=0),
) -> list[PasswordEntryOut]:
    return pw_svc.list_entries(uid, limit=limit, offset=offset)


@router.post(
    "/entries",
    response_model=PasswordEntryOut,
    summary="Create password entry (encrypted blob)",
)
def create_entry(body: PasswordEntryCreate, uid: str = Depends(get_current_uid)) -> PasswordEntryOut:
    return pw_svc.create_entry(uid, body)


@router.get(
    "/entries/{entry_id}",
    response_model=PasswordEntryOut,
    summary="Get one password entry",
)
def get_entry(entry_id: str, uid: str = Depends(get_current_uid)) -> PasswordEntryOut:
    return pw_svc.get_entry(uid, entry_id)


@router.patch(
    "/entries/{entry_id}",
    response_model=PasswordEntryOut,
    summary="Update password entry (encrypted blob)",
)
def patch_entry(
    entry_id: str,
    body: PasswordEntryUpdate,
    uid: str = Depends(get_current_uid),
) -> PasswordEntryOut:
    return pw_svc.update_entry(uid, entry_id, body)


@router.delete(
    "/entries/{entry_id}",
    status_code=204,
    summary="Delete password entry",
)
def delete_entry(entry_id: str, uid: str = Depends(get_current_uid)) -> None:
    pw_svc.delete_entry(uid, entry_id)

