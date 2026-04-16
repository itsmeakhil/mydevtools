from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, Field

DbType = Literal["postgresql", "mysql", "mariadb"]


class SqlConnectionCreate(BaseModel):
    """
    The full connection config (host, port, database, username, password) is
    encrypted client-side with the master AES-GCM key before being sent.
    The server stores only the ciphertext blob.
    """

    model_config = ConfigDict(extra="ignore")

    encryptedData: str = Field(min_length=1)
    iv: str = Field(min_length=1)
    name: Optional[str] = Field(default=None, min_length=1)
    type: DbType


class SqlConnectionUpdate(BaseModel):
    model_config = ConfigDict(extra="ignore")

    encryptedData: Optional[str] = Field(default=None, min_length=1)
    iv: Optional[str] = Field(default=None, min_length=1)
    name: Optional[str] = Field(default=None, min_length=1)
    type: Optional[DbType] = None


class SqlConnectionOut(BaseModel):
    """
    Returned to the client. The raw credentials are absent — the client decrypts
    encryptedData locally using the master key.
    """

    model_config = ConfigDict(extra="ignore")

    id: str
    userId: str
    encryptedData: str
    iv: str
    name: str
    type: DbType
    createdAt: int
    lastUsedAt: int
