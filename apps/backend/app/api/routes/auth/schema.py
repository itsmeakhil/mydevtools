
from pydantic import BaseModel, ConfigDict, Field


class SessionRequest(BaseModel):
    """Exchange a Firebase ID token once; API returns HttpOnly cookies (no JWT in JSON)."""

    id_token: str = Field(min_length=1)
    check_revoked: bool = True


class UserProfileResponse(BaseModel):
    uid: str
    email: str | None = None
    display_name: str | None = None
    photo_url: str | None = None
    email_verified: bool
    disabled: bool


class OkResponse(BaseModel):
    ok: bool


# ── Master-password vault ─────────────────────────────────────────────────────

class KeyVerifier(BaseModel):
    """AES-GCM ciphertext used to verify the derived key without storing the password."""

    model_config = ConfigDict(extra="ignore")

    encrypted: str = Field(min_length=1)
    iv: str = Field(min_length=1)


class MasterVaultSetupRequest(BaseModel):
    """Client sends PBKDF2 salt + key-verifier blob; server never sees the raw password."""

    salt: str = Field(min_length=1)
    verifier: KeyVerifier


class MasterVaultOut(BaseModel):
    model_config = ConfigDict(extra="ignore")

    salt: str
    verifier: KeyVerifier
    createdAt: int


# ── Backup codes ──────────────────────────────────────────────────────────────

class BackupCodeEntry(BaseModel):
    codeId: str = Field(min_length=1)
    codeSalt: str = Field(min_length=1)
    encrypted: str = Field(min_length=1)
    iv: str = Field(min_length=1)
    used: bool = False


class StoreBackupCodesRequest(BaseModel):
    codes: list[BackupCodeEntry] = Field(min_length=1, max_length=8)


class BackupCodeLookupRequest(BaseModel):
    codeId: str = Field(min_length=1)


class BackupCodeDataOut(BaseModel):
    codeSalt: str
    encrypted: str
    iv: str
