from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class EnvSetEntryCreate(BaseModel):
    encryptedData: str = Field(min_length=1)
    iv: str = Field(min_length=1)
    createdAt: Optional[int] = Field(default=None, ge=0)
    updatedAt: Optional[int] = Field(default=None, ge=0)


class EnvSetEntryUpdate(BaseModel):
    model_config = ConfigDict(extra="ignore")

    encryptedData: str = Field(min_length=1)
    iv: str = Field(min_length=1)
    updatedAt: Optional[int] = Field(default=None, ge=0)


class EnvSetEntryOut(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str
    encryptedData: str
    iv: str
    createdAt: int
    updatedAt: int
