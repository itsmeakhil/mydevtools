
from pydantic import BaseModel, Field


class SessionRequest(BaseModel):
    """Exchange a Firebase ID token once; API returns HttpOnly cookies (no JWT in JSON)."""

    id_token: str = Field(min_length=1)
    check_revoked: bool = True


class UserProfileResponse(BaseModel):
    uid: str
    email: str | None = None
    display_name: str | None = None
    photo_url: str | None = None
    email_verified: bool
    disabled: bool


class OkResponse(BaseModel):
    ok: bool
