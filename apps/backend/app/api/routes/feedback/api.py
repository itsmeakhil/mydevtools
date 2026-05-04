from typing import Annotated, Optional

from fastapi import APIRouter, Cookie, Depends, Header, Request

from app.api.routes.auth.tokens import decode_access_token
from app.api.routes.feedback.schema import FeedbackCreate, FeedbackOut
from app.api.routes.feedback import services as feedback_svc
from app.core.auth_cookies import ACCESS_COOKIE_NAME
from app.core.limiter import limiter


router = APIRouter(prefix="/feedback", tags=["feedback"])


def get_optional_uid(
    authorization: Annotated[str | None, Header(alias="Authorization")] = None,
    mdt_at: Annotated[str | None, Cookie(alias=ACCESS_COOKIE_NAME)] = None,
) -> Optional[str]:
    token: str | None = None
    if authorization:
        scheme, _, value = authorization.partition(" ")
        if scheme.lower() == "bearer" and value.strip():
            token = value.strip()
    if not token and mdt_at and mdt_at.strip():
        token = mdt_at.strip()
    if not token:
        return None
    try:
        return decode_access_token(token)
    except Exception:
        return None


@router.post("", response_model=FeedbackOut, summary="Submit feedback")
@limiter.limit("5/hour")
async def submit_feedback(
    request: Request,
    body: FeedbackCreate,
    uid: Optional[str] = Depends(get_optional_uid),
) -> FeedbackOut:
    return await feedback_svc.create_feedback(body, uid)
