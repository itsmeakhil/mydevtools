from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field


class PublicKeyCredentialOptions(BaseModel):
    """Pass-through container — server returns the WebAuthn JSON straight from the lib."""

    options: dict[str, Any]


class RegisterFinishRequest(BaseModel):
    credential: dict[str, Any]
    device_name: str | None = Field(default=None, max_length=80)


class LoginFinishRequest(BaseModel):
    credential: dict[str, Any]


class PasskeySummary(BaseModel):
    credential_id: str
    device_name: str | None = None
    backed_up: bool = False
    transports: list[str] = Field(default_factory=list)
    created_at: int | None = None
    last_used_at: int | None = None


class PasskeyListResponse(BaseModel):
    passkeys: list[PasskeySummary]


class RenamePasskeyRequest(BaseModel):
    device_name: str = Field(min_length=1, max_length=80)
