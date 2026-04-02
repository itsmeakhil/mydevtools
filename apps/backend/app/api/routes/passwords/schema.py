from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class KeyVerifier(BaseModel):
    model_config = ConfigDict(extra="ignore")

    encrypted: str = Field(min_length=1)
    iv: str = Field(min_length=1)


class VaultSetupRequest(BaseModel):
    salt: str = Field(min_length=1)
    verifier: KeyVerifier
    createdAt: Optional[int] = Field(default=None, ge=0)


class VaultOut(BaseModel):
    model_config = ConfigDict(extra="ignore")

    salt: str
    verifier: KeyVerifier
    createdAt: int


class PasswordEntryCreate(BaseModel):
    encryptedData: str = Field(min_length=1)
    iv: str = Field(min_length=1)
    createdAt: Optional[int] = Field(default=None, ge=0)
    updatedAt: Optional[int] = Field(default=None, ge=0)


class PasswordEntryUpdate(BaseModel):
    model_config = ConfigDict(extra="ignore")

    encryptedData: str = Field(min_length=1)
    iv: str = Field(min_length=1)
    updatedAt: Optional[int] = Field(default=None, ge=0)


class PasswordEntryOut(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str
    encryptedData: str
    iv: str
    createdAt: int
    updatedAt: int

