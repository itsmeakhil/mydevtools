from pydantic import BaseModel, ConfigDict, Field


class VerifyTokenRequest(BaseModel):
    id_token: str = Field(min_length=1)
    check_revoked: bool = False


class VerifiedTokenData(BaseModel):
    model_config = ConfigDict(extra="allow")

    uid: str
    email: str | None = None
    email_verified: bool | None = None
    name: str | None = None
    picture: str | None = None
    firebase: dict | None = None


class VerifyTokenResponse(BaseModel):
    token: VerifiedTokenData


class UserProfileResponse(BaseModel):
    uid: str
    email: str | None = None
    display_name: str | None = None
    photo_url: str | None = None
    email_verified: bool
    disabled: bool
