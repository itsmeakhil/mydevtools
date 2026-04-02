from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class ConnectionCreate(BaseModel):
    model_config = ConfigDict(extra="ignore")

    connectionString: str = Field(min_length=1)
    name: Optional[str] = Field(default=None, min_length=1)


class ConnectionUpdate(BaseModel):
    model_config = ConfigDict(extra="ignore")

    connectionString: Optional[str] = Field(default=None, min_length=1)
    name: Optional[str] = Field(default=None, min_length=1)


class ConnectionOut(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str
    userId: str
    connectionString: str
    name: str
    createdAt: int
    lastUsedAt: int

