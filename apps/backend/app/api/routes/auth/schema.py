from typing import Any, Dict, Optional

from pydantic import BaseModel, ConfigDict, Field


class VerifyTokenRequest(BaseModel):
    id_token: str = Field(min_length=1)
    check_revoked: bool = False


class VerifiedTokenData(BaseModel):
    model_config = ConfigDict(extra="allow")

    uid: str
    email: Optional[str] = None
    email_verified: Optional[bool] = None
    name: Optional[str] = None
    picture: Optional[str] = None
    firebase: Optional[Dict[str, Any]] = None


class VerifyTokenResponse(BaseModel):
    token: VerifiedTokenData


class UserProfileResponse(BaseModel):
    uid: str
    email: Optional[str] = None
    display_name: Optional[str] = None
    photo_url: Optional[str] = None
    email_verified: bool
    disabled: bool
