from fastapi import Response

from app.core.auth_cookies import ACCESS_COOKIE_NAME, REFRESH_COOKIE_NAME
from app.core.config import get_settings


def attach_auth_cookies(response: Response, access: str, refresh_plain: str) -> None:
    settings = get_settings()
    access_max = settings.ACCESS_TOKEN_EXPIRE_DAYS * 24 * 3600
    refresh_max = settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 3600
    common: dict = {
        "httponly": True,
        "secure": settings.AUTH_COOKIE_SECURE,
        "samesite": "lax",
        "path": "/",
    }
    response.set_cookie(ACCESS_COOKIE_NAME, access, max_age=access_max, **common)
    response.set_cookie(REFRESH_COOKIE_NAME, refresh_plain, max_age=refresh_max, **common)


def clear_auth_cookies(response: Response) -> None:
    settings = get_settings()
    common: dict = {
        "httponly": True,
        "secure": settings.AUTH_COOKIE_SECURE,
        "samesite": "lax",
        "path": "/",
    }
    response.delete_cookie(ACCESS_COOKIE_NAME, **common)
    response.delete_cookie(REFRESH_COOKIE_NAME, **common)
