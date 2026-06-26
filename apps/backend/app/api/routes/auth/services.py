import hashlib
from typing import Annotated

from fastapi import Cookie, Depends, Header, HTTPException, Request, status

from app.api.routes.auth.schema import UserProfileResponse, PersonalInfo, Certification
from app.api.routes.auth.tokens import decode_access_token
from app.api.routes.auth.users_repo import get_user_doc
from app.core.auth_cookies import ACCESS_COOKIE_NAME
from app.core.cache import cached as _cached, cache_invalidate, get_or_set
from app.core.cache.keys import build_key
from app.core.firebase import get_firebase_app

try:
    from firebase_admin import auth as firebase_auth
except ModuleNotFoundError:  # pragma: no cover
    firebase_auth = None  # type: ignore[assignment]


def _token_cache_key(token: str) -> str:
    h = hashlib.sha256(token.encode("utf-8")).hexdigest()[:16]
    return build_key(ns="auth_token", scope="global", uid=None, ver=None, op="verify", args_hash=h)


def verify_id_token(id_token: str, check_revoked: bool = False) -> dict:
    if firebase_auth is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="firebase-admin is not installed.",
        )

    get_firebase_app()
    try:
        return firebase_auth.verify_id_token(id_token, check_revoked=check_revoked)
    except firebase_auth.RevokedIdTokenError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has been revoked.",
        ) from exc
    except (firebase_auth.InvalidIdTokenError, firebase_auth.UserDisabledError, ValueError) as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Firebase ID token.",
        ) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to verify Firebase token.",
        ) from exc


async def verify_id_token_cached(id_token: str, check_revoked: bool = False) -> dict:
    key = _token_cache_key(id_token)

    async def _loader():
        return verify_id_token(id_token, check_revoked=check_revoked)

    return await get_or_set(ns="auth_token", key=key, loader=_loader)


@_cached(ns="auth_user", ttl=60, scope="user")
async def _fetch_user_doc_cached(*, uid: str) -> dict | None:
    return await get_user_doc(uid)


def get_current_uid(
    authorization: Annotated[str | None, Header(alias="Authorization")] = None,
    mdt_at: Annotated[str | None, Cookie(alias=ACCESS_COOKIE_NAME)] = None,
) -> str:
    token: str | None = None
    if authorization:
        scheme, _, value = authorization.partition(" ")
        if scheme.lower() == "bearer" and value.strip():
            token = value.strip()
    if not token and mdt_at and mdt_at.strip():
        token = mdt_at.strip()
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated.",
        )
    return decode_access_token(token)


async def get_current_user(
    request: Request,
    uid: str = Depends(get_current_uid),
) -> UserProfileResponse:
    """Resolve the current user profile, memoized per request on
    ``request.state.current_user_doc``.

    Multiple ``Depends(get_current_user)`` in the same request hit Mongo
    once. If a handler mutates the user document mid-request and needs
    fresh data afterwards, reset the slot first:
    ``request.state.current_user_doc = None``.
    """
    cached_doc = getattr(request.state, "current_user_doc", None)
    if cached_doc is not None and cached_doc.get("_id") == uid:
        doc = cached_doc
    else:
        doc = await _fetch_user_doc_cached(uid=uid)
        if not doc:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found.",
            )
        if doc.get("disabled"):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Account disabled.",
            )
        request.state.current_user_doc = doc

    return UserProfileResponse(
        uid=str(doc["_id"]),
        email=doc.get("email"),
        display_name=doc.get("display_name"),
        photo_url=doc.get("photo_url"),
        email_verified=bool(doc.get("email_verified")),
        disabled=bool(doc.get("disabled")),
        github_username=doc.get("github_username"),
        username=doc.get("username"),
        bio=doc.get("bio"),
        social_links=doc.get("social_links"),
        tech_stacks=doc.get("tech_stacks") or [],
        experiences=doc.get("experiences") or [],
        projects=doc.get("projects") or [],
        education=doc.get("education") or [],
        certifications=[Certification(**c) for c in doc.get("certifications") or []],
        portfolio_settings=doc.get("portfolio_settings"),
        personal_info=PersonalInfo(**doc["personal_info"]) if doc.get("personal_info") else None,
        onboarding_completed=bool(doc.get("onboarding_completed", False)),
    )
