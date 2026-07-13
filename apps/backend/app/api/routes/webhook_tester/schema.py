from datetime import datetime

from pydantic import BaseModel


class BinOut(BaseModel):
    bin_id: str
    created_at: datetime
    expires_at: datetime


class RecordedRequest(BaseModel):
    id: str
    method: str
    path: str = ""
    query: dict[str, str] = {}
    headers: dict[str, str] = {}
    body: str = ""
    body_encoding: str = "text"  # "text" | "base64" (binary payloads)
    body_truncated: bool = False
    content_type: str | None = None
    size: int = 0  # original body size in bytes (before truncation)
    source_ip: str | None = None
    received_at: datetime


class RequestListOut(BaseModel):
    bin_id: str
    expires_at: datetime
    count: int
    requests: list[RecordedRequest]
