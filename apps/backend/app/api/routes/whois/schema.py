from typing import Any, Literal

from pydantic import BaseModel


class WhoisContact(BaseModel):
    roles: list[str] = []
    name: str | None = None
    organization: str | None = None
    handle: str | None = None


class WhoisResult(BaseModel):
    target: str
    type: Literal["domain", "ip"]
    registrar: str | None = None
    status: list[str] = []
    created: str | None = None
    updated: str | None = None
    expires: str | None = None
    nameservers: list[str] = []
    contacts: list[WhoisContact] = []
    raw: dict[str, Any] = {}
