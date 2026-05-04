from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, Field


class FeedbackCreate(BaseModel):
    model_config = ConfigDict(extra="ignore")

    type: Literal["bug", "feature", "general"]
    message: str = Field(min_length=10, max_length=2000)
    rating: Optional[int] = Field(default=None, ge=1, le=5)
    email: Optional[str] = Field(default=None, max_length=254)
    page: Optional[str] = Field(default=None, max_length=500)


class FeedbackOut(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str
    type: str
    message: str
    rating: Optional[int]
    email: Optional[str]
    page: Optional[str]
    userId: Optional[str]
    createdAt: str
