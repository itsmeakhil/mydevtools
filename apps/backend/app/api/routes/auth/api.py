import asyncio
import re
from typing import Annotated

from fastapi import APIRouter, Cookie, Depends, Header, HTTPException, Request, Response, status

from app.core.limiter import limiter
from app.core import audit
from app.core.config import get_settings

from app.api.routes.auth.cookie_attach import attach_auth_cookies, clear_auth_cookies
from app.api.routes.auth.schema import (
    OkResponse,
    SessionRequest,
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
    get_user_doc,
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

    access = create_access_token(uid)
    raw_refresh = new_refresh_token()
    settings = get_settings()
    refresh_days = (
        settings.LONG_LIVED_REFRESH_TOKEN_EXPIRE_DAYS
        if payload.long_lived
        else settings.REFRESH_TOKEN_EXPIRE_DAYS
    )
    await set_refresh_token_hash(
        uid, hash_refresh_token(raw_refresh), long_lived=payload.long_lived
    )
    attach_auth_cookies(response, access, raw_refresh, refresh_days=refresh_days)

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
        created_at=doc.get("created_at"),
        onboarding_completed=bool(doc.get("onboarding_completed", False)),
        workspace_setup_at=doc.get("workspace_setup_at"),
        migrated_at=doc.get("migrated_at"),
        migration_status=doc.get("migration_status"),
        migration_progress=doc.get("migration_progress"),
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

    # Preserve the session's long-lived flag across rotation so desktop
    # sessions keep their 60-day cookie TTL on every refresh.
    user_doc = await get_user_doc(uid)
    long_lived = bool(user_doc.get("refresh_long_lived", False)) if user_doc else False
    settings = get_settings()
    refresh_days = (
        settings.LONG_LIVED_REFRESH_TOKEN_EXPIRE_DAYS
        if long_lived
        else settings.REFRESH_TOKEN_EXPIRE_DAYS
    )
    new_raw = new_refresh_token()
    await set_refresh_token_hash(uid, hash_refresh_token(new_raw), long_lived=long_lived)
    access = create_access_token(uid)
    attach_auth_cookies(response, access, new_raw, refresh_days=refresh_days)
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

    if payload.persona is not None:
        updates["persona"] = payload.persona

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


@router.post(
    "/desktop-token",
    summary="Mint a Firebase custom token for the desktop-app sign-in handoff",
)
async def desktop_token(uid: Annotated[str, Depends(get_current_uid)]) -> dict:
    # The web session (browser) mints a short-lived Firebase custom token which
    # is handed to the desktop app via the mydevtools:// deep link; the app
    # signs in with it and runs the normal session exchange.
    from app.core.firebase import get_firebase_app

    try:
        from firebase_admin import auth as firebase_auth
    except Exception:  # pragma: no cover - firebase_admin always present in prod
        raise HTTPException(status_code=503, detail="Firebase unavailable")
    get_firebase_app()
    token_bytes = firebase_auth.create_custom_token(uid)
    token = token_bytes.decode("utf-8") if isinstance(token_bytes, bytes) else token_bytes
    return {"token": token}


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
