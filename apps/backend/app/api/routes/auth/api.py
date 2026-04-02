from fastapi import APIRouter, Depends

from app.api.routes.auth.schema import (
    UserProfileResponse,
    VerifiedTokenData,
    VerifyTokenRequest,
    VerifyTokenResponse,
)
from app.api.routes.auth.services import get_current_user, verify_id_token

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/verify-token", response_model=VerifyTokenResponse, summary="Verify Firebase ID token")
def verify_token(payload: VerifyTokenRequest) -> VerifyTokenResponse:
    decoded = verify_id_token(payload.id_token, check_revoked=payload.check_revoked)
    return VerifyTokenResponse(token=VerifiedTokenData(**decoded))


@router.get("/me", response_model=UserProfileResponse, summary="Get current user profile")
def me(current_user: UserProfileResponse = Depends(get_current_user)) -> UserProfileResponse:
    return current_user
