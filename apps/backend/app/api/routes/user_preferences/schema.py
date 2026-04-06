from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator

ThemePreference = Literal["light", "dark", "system"]

DEFAULT_ENABLED_TOOLS = ["/app/to-do", "/app/notes", "/app/password-manager"]

MAX_NOSQL_HISTORY_QUERIES = 10


class ToolStatOut(BaseModel):
    model_config = ConfigDict(extra="ignore")

    usageCount: int = 0
    lastUsed: str = ""


class UserPreferencesOut(BaseModel):
    model_config = ConfigDict(extra="ignore")

    theme: ThemePreference = "system"
    accentColor: str = "blue"
    locale: str = "en"
    enabledTools: list[str] = Field(default_factory=lambda: list(DEFAULT_ENABLED_TOOLS))
    toolFavorites: list[str] = Field(default_factory=list)
    toolStats: dict[str, ToolStatOut] = Field(default_factory=dict)
    createdAt: int
    updatedAt: int


class UserPreferencesUpdate(BaseModel):
    model_config = ConfigDict(extra="ignore")

    theme: Optional[ThemePreference] = None
    accentColor: Optional[str] = Field(default=None, min_length=1)
    locale: Optional[str] = Field(default=None, min_length=1)
    enabledTools: Optional[list[str]] = None
    toolFavorites: Optional[list[str]] = None
    toolStats: Optional[dict[str, ToolStatOut]] = None


class ToolUsageTrackRequest(BaseModel):
    toolId: str = Field(min_length=1)


class NosqlQueryHistoryOut(BaseModel):
    model_config = ConfigDict(extra="ignore")

    connectionName: str = Field(min_length=1)
    dbName: str = Field(min_length=1)
    collectionName: str = Field(min_length=1)
    queries: list[str] = Field(default_factory=list)
    updatedAt: int


class NosqlQueryHistoryPut(BaseModel):
    connectionName: str = Field(min_length=1)
    dbName: str = Field(min_length=1)
    collectionName: str = Field(min_length=1)
    queries: list[str] = Field(default_factory=list)

    @field_validator("queries")
    @classmethod
    def cap_queries(cls, v: list[str]) -> list[str]:
        return v[:MAX_NOSQL_HISTORY_QUERIES]
