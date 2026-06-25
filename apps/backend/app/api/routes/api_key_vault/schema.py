from pydantic import BaseModel, ConfigDict, Field


class ApiKeyEntryCreate(BaseModel):
    encryptedData: str = Field(min_length=1)
    iv: str = Field(min_length=1)
    createdAt: int | None = Field(default=None, ge=0)
    updatedAt: int | None = Field(default=None, ge=0)


class ApiKeyEntryUpdate(BaseModel):
    model_config = ConfigDict(extra="ignore")

    encryptedData: str = Field(min_length=1)
    iv: str = Field(min_length=1)
    updatedAt: int | None = Field(default=None, ge=0)


class ApiKeyEntryOut(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str
    encryptedData: str
    iv: str
    createdAt: int
    updatedAt: int
