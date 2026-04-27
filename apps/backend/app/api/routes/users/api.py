from fastapi import APIRouter, HTTPException, Request, status

from app.api.routes.auth.users_repo import get_user_doc_by_username
from app.api.routes.users.schema import PublicUserProfileResponse
from app.core.limiter import limiter

router = APIRouter(prefix="/users", tags=["public", "users"])


@router.get(
    "/{username}",
    response_model=PublicUserProfileResponse,
    summary="Get public profile information by username",
)
@limiter.limit("30/minute")
def get_public_user_profile(request: Request, username: str) -> PublicUserProfileResponse:
    if not username:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username parameter is required."
        )

    doc = get_user_doc_by_username(username.lower())
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found."
        )

    return PublicUserProfileResponse(
        username=doc.get("username"),
        display_name=doc.get("display_name"),
        photo_url=doc.get("photo_url"),
        github_username=doc.get("github_username"),
        social_links=doc.get("social_links"),
    )
