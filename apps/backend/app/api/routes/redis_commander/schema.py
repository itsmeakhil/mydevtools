from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class RedisConnectionCreate(BaseModel):
    """
    The REDIS_URL (redis:// or rediss://) is encrypted client-side (AES-GCM)
    before being sent. The server stores only the ciphertext blob.
    """

    model_config = ConfigDict(extra="ignore")

    encryptedData: str = Field(min_length=1)
    iv: str = Field(min_length=1)
    name: Optional[str] = Field(default=None, min_length=1)


class RedisConnectionUpdate(BaseModel):
    model_config = ConfigDict(extra="ignore")

    encryptedData: Optional[str] = Field(default=None, min_length=1)
    iv: Optional[str] = Field(default=None, min_length=1)
    name: Optional[str] = Field(default=None, min_length=1)


class RedisConnectionOut(BaseModel):
    """
    Returned to the client. The raw REDIS_URL is absent — the client decrypts
    encryptedData locally using the master key.
    """

    model_config = ConfigDict(extra="ignore")

    id: str
    userId: str
    encryptedData: str
    iv: str
    name: str
    createdAt: int
    lastUsedAt: int
