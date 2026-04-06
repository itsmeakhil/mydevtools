from typing import Any, Optional

from pydantic import BaseModel, ConfigDict, Field


class ApiClientCollectionBase(BaseModel):
    name: str = Field(min_length=1)
    items: list[dict[str, Any]] = Field(default_factory=list)


class ApiClientCollectionCreate(BaseModel):
    name: str = Field(min_length=1)


class ApiClientCollectionUpdate(BaseModel):
    model_config = ConfigDict(extra="ignore")

    name: Optional[str] = Field(default=None, min_length=1)
    items: Optional[list[dict[str, Any]]] = None


class ApiClientCollectionOut(ApiClientCollectionBase):
    model_config = ConfigDict(extra="allow")

    id: str


class ApiClientEnvironmentBase(BaseModel):
    name: str = Field(min_length=1)
    variables: list[dict[str, Any]] = Field(default_factory=list)


class ApiClientEnvironmentCreate(BaseModel):
    name: str = Field(min_length=1)


class ApiClientEnvironmentUpdate(BaseModel):
    model_config = ConfigDict(extra="ignore")

    name: Optional[str] = Field(default=None, min_length=1)
    variables: Optional[list[dict[str, Any]]] = None


class ApiClientEnvironmentOut(ApiClientEnvironmentBase):
    model_config = ConfigDict(extra="allow")

    id: str


HISTORY_MAX_ITEMS = 100


class ApiClientHistoryCreate(BaseModel):
    """One sent request snapshot (matches web HistoryRequest minus id)."""

    model_config = ConfigDict(extra="ignore")

    method: str
    url: str
    params: list[dict[str, Any]] = Field(default_factory=list)
    headers: list[dict[str, Any]] = Field(default_factory=list)
    body: dict[str, Any] = Field(default_factory=dict)
    auth: dict[str, Any] = Field(default_factory=dict)
    name: str = Field(min_length=1)
    status: Optional[int] = None
    timestamp: Optional[int] = None


class ApiClientHistoryOut(BaseModel):
    model_config = ConfigDict(extra="allow")

    id: str
    method: str
    url: str
    params: list[dict[str, Any]]
    headers: list[dict[str, Any]]
    body: dict[str, Any]
    auth: dict[str, Any]
    name: str
    timestamp: int
    status: Optional[int] = None

