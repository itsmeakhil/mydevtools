import asyncio
import logging
import re
import time
from typing import Annotated

from fastapi import APIRouter, BackgroundTasks, Cookie, Depends, Header, HTTPException, Request, Response, status

from app.core.limiter import limiter
from app.core import audit

from app.api.routes.auth.cookie_attach import attach_auth_cookies, clear_auth_cookies
from app.api.routes.auth.schema import (
    BackupCodeDataOut,
    BackupCodeLookupRequest,
    MasterVaultOut,
    MasterVaultSetupRequest,
    OkResponse,
    SessionRequest,
    StoreBackupCodesRequest,
    UserProfileResponse,
    UpdateProfileRequest,
)
from app.api.routes.auth.services import get_current_uid, get_current_user, verify_id_token, _token_cache_key
from app.core.cache import bump_version, cache_invalidate
from app.api.routes.auth.tokens import (
    create_access_token,
    hash_refresh_token,
    new_refresh_token,
    try_decode_access_token_uid,
)
from app.api.routes.auth.users_repo import (
    clear_refresh_token_hash,
    complete_onboarding,
    find_uid_by_refresh_hash,
    get_backup_code_by_id,
    get_master_vault,
    get_user_doc,
    mark_backup_code_used,
    set_backup_codes,
    set_master_vault,
    set_refresh_token_hash,
    upsert_user_from_firebase_claims,
    update_user_profile,
    is_username_taken,
)
from app.core.auth_cookies import ACCESS_COOKIE_NAME, REFRESH_COOKIE_NAME

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/session", response_model=UserProfileResponse, summary="Firebase login → JWT cookies")
@limiter.limit("10/minute")
async def create_session(
    request: Request,
    payload: SessionRequest,
    response: Response,
    background_tasks: BackgroundTasks,
) -> UserProfileResponse:
    decoded = await asyncio.to_thread(
        verify_id_token,
        payload.id_token,
        payload.check_revoked,
    )
    uid = decoded.get("uid")
    if not uid:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token payload missing user id.",
        )

    await upsert_user_from_firebase_claims(decoded)

    # Ensure user workspace setup (idempotent first-login hook)
    try:
        from app.api.routes.workspaces.services import ensure_user_workspace_setup
        await ensure_user_workspace_setup(uid, background_tasks=background_tasks)
    except Exception as exc:
        logging.getLogger(__name__).warning("Workspace setup failed for %s: %s", uid, exc)

    access = create_access_token(uid)
    raw_refresh = new_refresh_token()
    await set_refresh_token_hash(uid, hash_refresh_token(raw_refresh))
    attach_auth_cookies(response, access, raw_refresh)

    doc = await get_user_doc(uid)
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="User record missing after upsert.",
        )
    audit.set_action("auth.login")
    audit.set_entity("user", uid)
    audit.set_summary("Signed in")
    return UserProfileResponse(
        uid=str(doc["_id"]),
        email=doc.get("email"),
        display_name=doc.get("display_name"),
        photo_url=doc.get("photo_url"),
        email_verified=bool(doc.get("email_verified")),
        disabled=bool(doc.get("disabled")),
        onboarding_completed=bool(doc.get("onboarding_completed", False)),
    )


@router.post("/refresh", response_model=OkResponse, summary="Rotate tokens using refresh cookie")
@limiter.limit("10/minute")
async def refresh_session(
    request: Request,
    response: Response,
    mdt_rt: Annotated[str | None, Cookie(alias=REFRESH_COOKIE_NAME)] = None,
) -> OkResponse:
    if not mdt_rt or not mdt_rt.strip():
        clear_auth_cookies(response)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing refresh token.",
        )

    token_hash = hash_refresh_token(mdt_rt.strip())
    uid = await find_uid_by_refresh_hash(token_hash)
    if not uid:
        clear_auth_cookies(response)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token.",
        )

    new_raw = new_refresh_token()
    await set_refresh_token_hash(uid, hash_refresh_token(new_raw))
    access = create_access_token(uid)
    attach_auth_cookies(response, access, new_raw)
    audit.set_action("auth.token_refresh")
    audit.set_entity("user", uid)
    audit.set_summary("Refreshed session")
    return OkResponse(ok=True)


@router.post(
    "/logout",
    response_model=OkResponse,
    summary="Logout: clear cookies and server refresh hash",
)
async def logout(
    response: Response,
    authorization: Annotated[str | None, Header(alias="Authorization")] = None,
    mdt_at: Annotated[str | None, Cookie(alias=ACCESS_COOKIE_NAME)] = None,
    mdt_rt: Annotated[str | None, Cookie(alias=REFRESH_COOKIE_NAME)] = None,
) -> OkResponse:
    uid: str | None = None

    token: str | None = None
    if authorization:
        scheme, _, value = authorization.partition(" ")
        if scheme.lower() == "bearer" and value.strip():
            token = value.strip()
    if not token and mdt_at and mdt_at.strip():
        token = mdt_at.strip()
    if token:
        uid = try_decode_access_token_uid(token)

    if uid is None and mdt_rt and mdt_rt.strip():
        uid = await find_uid_by_refresh_hash(hash_refresh_token(mdt_rt.strip()))

    clear_auth_cookies(response)
    if uid:
        await clear_refresh_token_hash(uid)
    audit.set_action("auth.logout")
    if uid:
        audit.set_entity("user", uid)
    audit.set_summary("Signed out")
    try:
        if token:
            await cache_invalidate(ns="auth_token", key=_token_cache_key(token))
        if uid:
            await bump_version(ns="auth_user", uid=uid)
    except Exception:
        pass  # fail-open
    return OkResponse(ok=True)


@router.get(
    "/me",
    response_model=UserProfileResponse,
    summary="Current user profile from MongoDB",
)
async def me(
    current_user: Annotated[UserProfileResponse, Depends(get_current_user)],
) -> UserProfileResponse:
    return current_user


@router.patch(
    "/profile",
    response_model=UserProfileResponse,
    summary="Update current user profile in MongoDB",
)
async def update_profile(
    payload: UpdateProfileRequest,
    current_user: Annotated[UserProfileResponse, Depends(get_current_user)],
) -> UserProfileResponse:
    updates = {}
    if payload.github_username is not None:
        updates["github_username"] = payload.github_username

    if payload.username is not None:
        if payload.username.strip():
            candidate = payload.username.strip().lower()
            if not re.match(r"^[a-z0-9][a-z0-9_-]{1,28}[a-z0-9]$", candidate):
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail="Username must be 3-30 characters, alphanumeric with hyphens/underscores, and start/end with a letter or digit.",
                )
            reserved = {"admin", "api", "settings", "login", "logout", "profile", "dashboard", "app", "help", "null", "undefined"}
            if candidate in reserved:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail="This username is reserved.",
                )
            if await is_username_taken(candidate, current_user.uid):
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="Username is already taken.",
                )
            updates["username"] = candidate
        else:
            updates["username"] = None

    if payload.social_links is not None:
        updates["social_links"] = payload.social_links.model_dump()

    if payload.tech_stacks is not None:
        updates["tech_stacks"] = payload.tech_stacks

    if payload.bio is not None:
        updates["bio"] = payload.bio

    if payload.experiences is not None:
        updates["experiences"] = [e.model_dump() for e in payload.experiences]

    if payload.projects is not None:
        updates["projects"] = [p.model_dump() for p in payload.projects]

    if payload.education is not None:
        updates["education"] = [e.model_dump() for e in payload.education]

    if payload.certifications is not None:
        updates["certifications"] = [c.model_dump() for c in payload.certifications]

    if payload.portfolio_settings is not None:
        updates["portfolio_settings"] = payload.portfolio_settings.model_dump()

    if payload.personal_info is not None:
        updates["personal_info"] = payload.personal_info.model_dump()

    if updates:
        await update_user_profile(current_user.uid, updates)

    if "github_username" in updates:
        current_user.github_username = updates["github_username"]
    if "username" in updates:
        current_user.username = updates["username"]
    if "social_links" in updates:
        current_user.social_links = payload.social_links
    if "tech_stacks" in updates:
        current_user.tech_stacks = updates["tech_stacks"]
    if "bio" in updates:
        current_user.bio = updates["bio"]
    if "experiences" in updates:
        current_user.experiences = payload.experiences
    if "projects" in updates:
        current_user.projects = payload.projects
    if "education" in updates:
        current_user.education = payload.education
    if "certifications" in updates:
        current_user.certifications = payload.certifications
    if "portfolio_settings" in updates:
        current_user.portfolio_settings = payload.portfolio_settings
    if "personal_info" in updates:
        current_user.personal_info = payload.personal_info

    return current_user


@router.get(
    "/session/check",
    response_model=OkResponse,
    summary="Validates access JWT (200 if ok)",
)
async def session_check(_uid: Annotated[str, Depends(get_current_uid)]) -> OkResponse:
    return OkResponse(ok=True)


# ── Master-password vault ─────────────────────────────────────────────────────


@router.get(
    "/master-vault",
    response_model=MasterVaultOut,
    summary="Retrieve master-vault metadata (salt + verifier) for the current user",
)
async def get_master_vault_endpoint(
    uid: Annotated[str, Depends(get_current_uid)],
) -> MasterVaultOut:
    vault = await get_master_vault(uid)
    if not vault:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Master vault not configured.",
        )
    return MasterVaultOut(**vault)


@router.post(
    "/master-vault",
    response_model=MasterVaultOut,
    status_code=status.HTTP_201_CREATED,
    summary="Set up master vault once (salt + key-verifier blob; raw password never sent)",
)
@limiter.limit("3/minute")
async def setup_master_vault_endpoint(
    request: Request,
    payload: MasterVaultSetupRequest,
    uid: Annotated[str, Depends(get_current_uid)],
) -> MasterVaultOut:
    if await get_master_vault(uid):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Master vault already configured.",
        )
    created_at = int(time.time() * 1000)
    vault: dict = {
        "salt": payload.salt,
        "verifier": payload.verifier.model_dump(),
        "createdAt": created_at,
    }
    await set_master_vault(uid, vault)
    return MasterVaultOut(**vault)


# ── Backup codes ──────────────────────────────────────────────────────────────


@router.post(
    "/backup-codes",
    response_model=OkResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Store encrypted backup codes (replaces any existing set)",
)
@limiter.limit("10/minute")
async def store_backup_codes_endpoint(
    request: Request,
    payload: StoreBackupCodesRequest,
    uid: Annotated[str, Depends(get_current_uid)],
) -> OkResponse:
    await set_backup_codes(uid, [c.model_dump() for c in payload.codes])
    return OkResponse(ok=True)


@router.post(
    "/backup-codes/lookup",
    response_model=BackupCodeDataOut,
    summary="Return encrypted blob for a backup code ID (does not consume the code)",
)
@limiter.limit("20/minute")
async def lookup_backup_code_endpoint(
    request: Request,
    payload: BackupCodeLookupRequest,
    uid: Annotated[str, Depends(get_current_uid)],
) -> BackupCodeDataOut:
    code = await get_backup_code_by_id(uid, payload.codeId)
    if not code:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Backup code not found or already used.",
        )
    return BackupCodeDataOut(
        codeSalt=code["codeSalt"],
        encrypted=code["encrypted"],
        iv=code["iv"],
    )


@router.post(
    "/backup-codes/use",
    response_model=OkResponse,
    summary="Mark a backup code as used (one-time consumption)",
)
@limiter.limit("10/minute")
async def use_backup_code_endpoint(
    request: Request,
    payload: BackupCodeLookupRequest,
    uid: Annotated[str, Depends(get_current_uid)],
) -> OkResponse:
    await mark_backup_code_used(uid, payload.codeId)
    return OkResponse(ok=True)


# ── Onboarding ────────────────────────────────────────────────────────────────


@router.post(
    "/onboarding/complete",
    response_model=OkResponse,
    summary="Mark onboarding as completed for the current user",
)
@limiter.limit("10/minute")
async def complete_onboarding_endpoint(
    request: Request,
    uid: Annotated[str, Depends(get_current_uid)],
) -> OkResponse:
    await complete_onboarding(uid)
    return OkResponse(ok=True)
