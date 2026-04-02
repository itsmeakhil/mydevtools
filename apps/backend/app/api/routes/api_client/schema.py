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

