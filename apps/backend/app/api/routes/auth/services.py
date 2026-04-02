from typing import Optional

from fastapi import Header, HTTPException, status
try:
    from firebase_admin import auth as firebase_auth
except ModuleNotFoundError:  # pragma: no cover
    firebase_auth = None  # type: ignore[assignment]

from app.api.routes.auth.schema import UserProfileResponse
from app.core.firebase import get_firebase_app


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


def extract_bearer_token(authorization: Optional[str]) -> str:
    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing Authorization header.",
        )

    scheme, _, token = authorization.partition(" ")
    if scheme.lower() != "bearer" or not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authorization header must be Bearer token.",
        )
    return token


def get_current_uid(authorization: Optional[str] = Header(default=None)) -> str:
    token = extract_bearer_token(authorization)
    decoded = verify_id_token(token, check_revoked=True)
    uid = decoded.get("uid")
    if not uid:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token payload missing user id.",
        )
    return uid


def get_current_user(authorization: Optional[str] = Header(default=None)) -> UserProfileResponse:
    token = extract_bearer_token(authorization)
    decoded = verify_id_token(token, check_revoked=True)
    uid = decoded.get("uid")
    if not uid:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token payload missing user id.",
        )

    get_firebase_app()
    try:
        user = firebase_auth.get_user(uid)
    except firebase_auth.UserNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Firebase user not found.",
        ) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to fetch Firebase user profile.",
        ) from exc

    return UserProfileResponse(
        uid=user.uid,
        email=user.email,
        display_name=user.display_name,
        photo_url=user.photo_url,
        email_verified=user.email_verified,
        disabled=user.disabled,
    )
