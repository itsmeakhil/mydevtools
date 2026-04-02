from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, Field


ThemePreference = Literal["light", "dark", "system"]


class UserPreferencesOut(BaseModel):
    model_config = ConfigDict(extra="ignore")

    theme: ThemePreference = "system"
    accentColor: str = "blue"
    locale: str = "en"
    createdAt: int
    updatedAt: int


class UserPreferencesUpdate(BaseModel):
    model_config = ConfigDict(extra="ignore")

    theme: Optional[ThemePreference] = None
    accentColor: Optional[str] = Field(default=None, min_length=1)
    locale: Optional[str] = Field(default=None, min_length=1)

