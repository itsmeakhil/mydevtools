from typing import Optional
from pydantic import BaseModel, ConfigDict, Field, HttpUrl

COLLECTION = "url_links"


class ShortLinkCreate(BaseModel):
    model_config = ConfigDict(extra="ignore")

    original_url: str = Field(min_length=1, max_length=2048)
    title: Optional[str] = Field(default=None, max_length=200)
    custom_code: Optional[str] = Field(default=None, min_length=3, max_length=20)


class ShortLinkUpdate(BaseModel):
    model_config = ConfigDict(extra="ignore")

    title: Optional[str] = Field(default=None, max_length=200)
    active: Optional[bool] = None


class ShortLinkOut(BaseModel):
    code: str
    original_url: str
    title: str
    created_by: str
    created_at: int
    clicks: int
    active: bool


class ShortLinkResolve(BaseModel):
    original_url: str
    active: bool
