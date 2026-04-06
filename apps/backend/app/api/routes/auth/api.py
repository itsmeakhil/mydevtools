import time
from typing import Annotated

from fastapi import APIRouter, Cookie, Depends, Header, HTTPException, Response, status

from app.api.routes.auth.cookie_attach import attach_auth_cookies, clear_auth_cookies
from app.api.routes.auth.schema import (
    MasterVaultOut,
    MasterVaultSetupRequest,
    OkResponse,
    SessionRequest,
    UserProfileResponse,
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
    get_master_vault,
    get_user_doc,
    set_master_vault,
    set_refresh_token_hash,
    upsert_user_from_firebase_claims,
)
from app.core.auth_cookies import ACCESS_COOKIE_NAME, REFRESH_COOKIE_NAME

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/session", response_model=UserProfileResponse, summary="Firebase login → JWT cookies")
def create_session(payload: SessionRequest, response: Response) -> UserProfileResponse:
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
def refresh_session(
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
def setup_master_vault_endpoint(
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
