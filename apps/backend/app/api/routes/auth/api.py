import re
import time
from typing import Annotated

from fastapi import APIRouter, Cookie, Depends, Header, HTTPException, Request, Response, status

from app.core.limiter import limiter

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
from app.api.routes.auth.services import get_current_uid, get_current_user, verify_id_token
from app.api.routes.auth.tokens import (
    create_access_token,
    hash_refresh_token,
    new_refresh_token,
    try_decode_access_token_uid,
)
from app.api.routes.auth.users_repo import (
    clear_refresh_token_hash,
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
def create_session(request: Request, payload: SessionRequest, response: Response) -> UserProfileResponse:
    decoded = verify_id_token(payload.id_token, check_revoked=payload.check_revoked)
    uid = decoded.get("uid")
    if not uid:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token payload missing user id.",
        )

    upsert_user_from_firebase_claims(decoded)
    access = create_access_token(uid)
    raw_refresh = new_refresh_token()
    set_refresh_token_hash(uid, hash_refresh_token(raw_refresh))
    attach_auth_cookies(response, access, raw_refresh)

    doc = get_user_doc(uid)
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="User record missing after upsert.",
        )
    return UserProfileResponse(
        uid=str(doc["_id"]),
        email=doc.get("email"),
        display_name=doc.get("display_name"),
        photo_url=doc.get("photo_url"),
        email_verified=bool(doc.get("email_verified")),
        disabled=bool(doc.get("disabled")),
    )


@router.post("/refresh", response_model=OkResponse, summary="Rotate tokens using refresh cookie")
@limiter.limit("10/minute")
def refresh_session(
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
    uid = find_uid_by_refresh_hash(token_hash)
    if not uid:
        clear_auth_cookies(response)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token.",
        )

    new_raw = new_refresh_token()
    set_refresh_token_hash(uid, hash_refresh_token(new_raw))
    access = create_access_token(uid)
    attach_auth_cookies(response, access, new_raw)
    return OkResponse(ok=True)


@router.post(
    "/logout",
    response_model=OkResponse,
    summary="Logout: clear cookies and server refresh hash",
)
def logout(
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
        uid = find_uid_by_refresh_hash(hash_refresh_token(mdt_rt.strip()))

    clear_auth_cookies(response)
    if uid:
        clear_refresh_token_hash(uid)
    return OkResponse(ok=True)


@router.get(
    "/me",
    response_model=UserProfileResponse,
    summary="Current user profile from MongoDB",
)
def me(
    current_user: Annotated[UserProfileResponse, Depends(get_current_user)],
) -> UserProfileResponse:
    return current_user


@router.patch(
    "/profile",
    response_model=UserProfileResponse,
    summary="Update current user profile in MongoDB",
)
def update_profile(
    payload: UpdateProfileRequest,
    current_user: Annotated[UserProfileResponse, Depends(get_current_user)],
) -> UserProfileResponse:
    updates = {}
    if payload.github_username is not None:
        updates["github_username"] = payload.github_username
        
    if payload.username is not None:
        # Check uniqueness constraint
        if payload.username.strip():
            candidate = payload.username.strip().lower()
            # L-6 fix: validate username format
            if not re.match(r"^[a-z0-9][a-z0-9_-]{1,28}[a-z0-9]$", candidate):
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail="Username must be 3-30 characters, alphanumeric with hyphens/underscores, and start/end with a letter or digit.",
                )
            # Block reserved words that could conflict with routes
            reserved = {"admin", "api", "settings", "login", "logout", "profile", "dashboard", "app", "help", "null", "undefined"}
            if candidate in reserved:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail="This username is reserved.",
                )
            if is_username_taken(candidate, current_user.uid):
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="Username is already taken.",
                )
            updates["username"] = candidate
        else:
            # Nullify
            updates["username"] = None

    if payload.social_links is not None:
        updates["social_links"] = payload.social_links.model_dump()

    if payload.tech_stacks is not None:
        updates["tech_stacks"] = payload.tech_stacks

    if updates:
        update_user_profile(current_user.uid, updates)

    # Return the updated profile manually since we just modified it
    if "github_username" in updates:
        current_user.github_username = updates["github_username"]
    if "username" in updates:
        current_user.username = updates["username"]
    if "social_links" in updates:
        current_user.social_links = payload.social_links
    if "tech_stacks" in updates:
        current_user.tech_stacks = updates["tech_stacks"]

    return current_user


@router.get(
    "/session/check",
    response_model=OkResponse,
    summary="Validates access JWT (200 if ok)",
)
def session_check(_uid: Annotated[str, Depends(get_current_uid)]) -> OkResponse:
    return OkResponse(ok=True)


# ── Master-password vault ─────────────────────────────────────────────────────


@router.get(
    "/master-vault",
    response_model=MasterVaultOut,
    summary="Retrieve master-vault metadata (salt + verifier) for the current user",
)
def get_master_vault_endpoint(
    uid: Annotated[str, Depends(get_current_uid)],
) -> MasterVaultOut:
    vault = get_master_vault(uid)
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
def setup_master_vault_endpoint(
    request: Request,
    payload: MasterVaultSetupRequest,
    uid: Annotated[str, Depends(get_current_uid)],
) -> MasterVaultOut:
    if get_master_vault(uid):
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
    set_master_vault(uid, vault)
    return MasterVaultOut(**vault)


# ── Backup codes ──────────────────────────────────────────────────────────────


@router.post(
    "/backup-codes",
    response_model=OkResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Store encrypted backup codes (replaces any existing set)",
)
@limiter.limit("10/minute")
def store_backup_codes_endpoint(
    request: Request,
    payload: StoreBackupCodesRequest,
    uid: Annotated[str, Depends(get_current_uid)],
) -> OkResponse:
    set_backup_codes(uid, [c.model_dump() for c in payload.codes])
    return OkResponse(ok=True)


@router.post(
    "/backup-codes/lookup",
    response_model=BackupCodeDataOut,
    summary="Return encrypted blob for a backup code ID (does not consume the code)",
)
@limiter.limit("20/minute")
def lookup_backup_code_endpoint(
    request: Request,
    payload: BackupCodeLookupRequest,
    uid: Annotated[str, Depends(get_current_uid)],
) -> BackupCodeDataOut:
    code = get_backup_code_by_id(uid, payload.codeId)
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
def use_backup_code_endpoint(
    request: Request,
    payload: BackupCodeLookupRequest,
    uid: Annotated[str, Depends(get_current_uid)],
) -> OkResponse:
    mark_backup_code_used(uid, payload.codeId)
    return OkResponse(ok=True)
