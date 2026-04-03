from typing import Annotated

from fastapi import Cookie, Depends, Header, HTTPException, status

from app.api.routes.auth.schema import UserProfileResponse
from app.api.routes.auth.tokens import decode_access_token
from app.api.routes.auth.users_repo import get_user_doc
from app.core.auth_cookies import ACCESS_COOKIE_NAME
from app.core.firebase import get_firebase_app

try:
    from firebase_admin import auth as firebase_auth
except ModuleNotFoundError:  # pragma: no cover
    firebase_auth = None  # type: ignore[assignment]


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


def get_current_user(uid: str = Depends(get_current_uid)) -> UserProfileResponse:
    doc = get_user_doc(uid)
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found.",
        )
    if doc.get("disabled"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account disabled.",
        )
    return UserProfileResponse(
        uid=str(doc["_id"]),
        email=doc.get("email"),
        display_name=doc.get("display_name"),
        photo_url=doc.get("photo_url"),
        email_verified=bool(doc.get("email_verified")),
        disabled=bool(doc.get("disabled")),
    )
