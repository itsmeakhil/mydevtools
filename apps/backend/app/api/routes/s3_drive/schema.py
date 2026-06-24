
from pydantic import BaseModel, ConfigDict, Field

# ── Stored connection (credentials encrypted client-side) ─────────────────────

class S3ConnectionCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    provider: str = Field(min_length=1, max_length=50)  # "aws" | "digitalocean" | "custom"
    encryptedData: str = Field(min_length=1)
    iv: str = Field(min_length=1)
    createdAt: int | None = Field(default=None, ge=0)


class S3ConnectionUpdate(BaseModel):
    model_config = ConfigDict(extra="ignore")

    name: str | None = Field(default=None, min_length=1, max_length=100)
    provider: str | None = Field(default=None, min_length=1, max_length=50)
    encryptedData: str | None = Field(default=None, min_length=1)
    iv: str | None = Field(default=None, min_length=1)
    updatedAt: int | None = Field(default=None, ge=0)


class S3ConnectionOut(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str
    name: str
    provider: str
    encryptedData: str
    iv: str
    createdAt: int
    updatedAt: int


# ── Credentials sent per-operation (decrypted client-side, over HTTPS) ────────

class S3Credentials(BaseModel):
    accessKey: str = Field(min_length=1)
    secretKey: str = Field(min_length=1)
    region: str = Field(default="us-east-1")
    bucket: str = Field(min_length=1)
    endpoint: str | None = Field(default=None)  # custom endpoint for DO Spaces / self-hosted


# ── Operation request bodies ──────────────────────────────────────────────────

class ListObjectsRequest(BaseModel):
    credentials: S3Credentials
    prefix: str = Field(default="")
    delimiter: str = Field(default="/")
    continuationToken: str | None = Field(default=None)
    maxKeys: int = Field(default=1000, ge=1, le=1000)


class DeleteObjectsRequest(BaseModel):
    credentials: S3Credentials
    keys: list[str] = Field(min_length=1)


class CreateFolderRequest(BaseModel):
    credentials: S3Credentials
    prefix: str = Field(min_length=1)


class PresignedDownloadRequest(BaseModel):
    credentials: S3Credentials
    key: str = Field(min_length=1)
    expiresIn: int = Field(default=3600, ge=60, le=86400)


class PresignedUploadRequest(BaseModel):
    credentials: S3Credentials
    key: str = Field(min_length=1)
    contentType: str = Field(default="application/octet-stream")
    expiresIn: int = Field(default=3600, ge=60, le=86400)


class MoveObjectRequest(BaseModel):
    credentials: S3Credentials
    sourceKey: str = Field(min_length=1)
    destinationKey: str = Field(min_length=1)


class ListBucketsRequest(BaseModel):
    credentials: S3Credentials


class PresignedBatchItem(BaseModel):
    key: str = Field(min_length=1)
    op: str = Field(default="get", pattern="^(get|put)$")
    contentType: str | None = Field(default=None)


class PresignedBatchRequest(BaseModel):
    credentials: S3Credentials
    items: list[PresignedBatchItem] = Field(min_length=1, max_length=100)
    expiresIn: int = Field(default=3600, ge=60, le=86400)


class ConfigureCorsRequest(BaseModel):
    credentials: S3Credentials
    allowedOrigins: list[str] = Field(min_length=1, description="Allowed CORS origins for the S3 bucket. Must be explicitly provided.")


# ── Operation response models ─────────────────────────────────────────────────

class S3ObjectItem(BaseModel):
    key: str
    size: int | None = None
    lastModified: str | None = None
    etag: str | None = None
    isFolder: bool = False


class ListObjectsResponse(BaseModel):
    objects: list[S3ObjectItem]
    prefixes: list[str]
    isTruncated: bool
    nextContinuationToken: str | None = None


class PresignedUrlResponse(BaseModel):
    url: str
    key: str


class PresignedBatchResponse(BaseModel):
    urls: list[PresignedUrlResponse]


class BucketInfo(BaseModel):
    name: str
    creationDate: str | None = None
