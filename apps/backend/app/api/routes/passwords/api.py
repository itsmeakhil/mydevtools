from fastapi import APIRouter, Depends, Query, Request

from app.api.routes.passwords import services as pw_svc
from app.api.routes.passwords.schema import (
    PasswordEntryCreate,
    PasswordEntryOut,
    PasswordEntryUpdate,
    VaultOut,
    VaultSetupRequest,
)
from app.api.routes.workspaces.middleware import WorkspaceContext, get_workspace_ctx
from app.core.limiter import limiter

router = APIRouter(prefix="/password-manager", tags=["password-manager"])


@router.get("/vault", response_model=VaultOut, summary="Get password vault settings")
async def get_vault(ctx: WorkspaceContext = Depends(get_workspace_ctx)) -> VaultOut:
    return await pw_svc.get_vault(ctx=ctx)


@router.post("/vault/setup", response_model=VaultOut, summary="Setup/replace password vault")
@limiter.limit("3/minute")
async def setup_vault(request: Request, body: VaultSetupRequest, ctx: WorkspaceContext = Depends(get_workspace_ctx)) -> VaultOut:
    return await pw_svc.setup_vault(ctx, body)


@router.post(
    "/vault/clear",
    summary="Delete vault + all encrypted entries (clearAll equivalent)",
)
@limiter.limit("3/minute")
async def clear_vault(request: Request, ctx: WorkspaceContext = Depends(get_workspace_ctx)) -> dict[str, int]:
    return await pw_svc.clear_vault(ctx)


@router.get(
    "/entries",
    response_model=list[PasswordEntryOut],
    summary="List encrypted password entries",
)
async def list_entries(
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    limit: int = Query(default=200, ge=1, le=1000),
    offset: int = Query(default=0, ge=0),
) -> list[PasswordEntryOut]:
    return await pw_svc.list_entries(ctx=ctx, limit=limit, offset=offset)


@router.post(
    "/entries",
    response_model=PasswordEntryOut,
    summary="Create password entry (encrypted blob)",
)
@limiter.limit("30/minute")
async def create_entry(request: Request, body: PasswordEntryCreate, ctx: WorkspaceContext = Depends(get_workspace_ctx)) -> PasswordEntryOut:
    return await pw_svc.create_entry(ctx, body)


@router.get(
    "/entries/{entry_id}",
    response_model=PasswordEntryOut,
    summary="Get one password entry",
)
async def get_entry(entry_id: str, ctx: WorkspaceContext = Depends(get_workspace_ctx)) -> PasswordEntryOut:
    return await pw_svc.get_entry(ctx=ctx, entry_id=entry_id)


@router.patch(
    "/entries/{entry_id}",
    response_model=PasswordEntryOut,
    summary="Update password entry (encrypted blob)",
)
async def patch_entry(
    entry_id: str,
    body: PasswordEntryUpdate,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
) -> PasswordEntryOut:
    return await pw_svc.update_entry(ctx, entry_id, body)


@router.delete(
    "/entries/{entry_id}",
    status_code=204,
    summary="Delete password entry",
)
async def delete_entry(entry_id: str, ctx: WorkspaceContext = Depends(get_workspace_ctx)) -> None:
    await pw_svc.delete_entry(ctx, entry_id)
