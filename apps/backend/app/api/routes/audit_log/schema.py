from typing import Any, Optional

from pydantic import BaseModel


class AuditChange(BaseModel):
    field: str
    before: Any | None = None
    after: Any | None = None


class AuditDevice(BaseModel):
    browser: str
    os: str
    device_type: str


class AuditEventOut(BaseModel):
    id: str
    uid: Optional[str] = None
    action: str
    module: Optional[str] = None
    entity_type: Optional[str] = None
    entity_id: Optional[str] = None
    method: str
    path: str
    status: int
    outcome: str
    changes: Optional[list[AuditChange]] = None
    summary: Optional[str] = None
    ip: Optional[str] = None
    ua_raw: Optional[str] = None
    device: Optional[AuditDevice] = None
    latency_ms: int
    ts: int


class AuditListOut(BaseModel):
    items: list[AuditEventOut]
    total: int
    skip: int
    limit: int
