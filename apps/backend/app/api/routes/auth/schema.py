from __future__ import annotations

from typing import Optional
from pydantic import BaseModel, ConfigDict, Field, field_validator


class SessionRequest(BaseModel):
    """Exchange a Firebase ID token once; API returns HttpOnly cookies (no JWT in JSON)."""

    id_token: str = Field(min_length=1)
    check_revoked: bool = True


class SocialLinks(BaseModel):
    website: Optional[str] = None
    twitter: Optional[str] = None
    instagram: Optional[str] = None
    linkedin: Optional[str] = None
    youtube: Optional[str] = None
    devto: Optional[str] = None
    hashnode: Optional[str] = None
    github: Optional[str] = None


class Experience(BaseModel):
    id: str
    company: str
    role: str
    startDate: str
    endDate: Optional[str] = None
    description: Optional[str] = None
    technologies: list[str] = Field(default_factory=list)
    employmentType: Optional[str] = None
    location: Optional[str] = None


class Project(BaseModel):
    id: str
    title: str
    description: str
    imageUrl: Optional[str] = None
    githubUrl: Optional[str] = None
    liveUrl: Optional[str] = None
    technologies: list[str] = Field(default_factory=list)


class Education(BaseModel):
    id: str
    institution: str
    degree: str
    startDate: str
    endDate: Optional[str] = None
    description: Optional[str] = None


class PortfolioSettings(BaseModel):
    theme: Optional[str] = "bento"
    font: Optional[str] = "sans"
    accentColor: Optional[str] = "#3b82f6"
    rssFeedUrl: Optional[str] = None
    showGithubStats: bool = True
    resumePdfUrl: Optional[str] = None


class Language(BaseModel):
    name: str
    level: str = "Fluent"


class Certification(BaseModel):
    id: str
    name: str
    issuer: str
    issueDate: Optional[str] = None
    expiryDate: Optional[str] = None
    credentialUrl: Optional[str] = None


class PersonalInfo(BaseModel):
    phone: Optional[str] = None
    location: Optional[str] = None
    date_of_birth: Optional[str] = None
    nationality: Optional[str] = None
    headline: Optional[str] = None
    languages: list[Language] = Field(default_factory=list)
    hobbies: list[str] = Field(default_factory=list)

    @field_validator("languages", mode="before")
    @classmethod
    def coerce_languages(cls, v: list) -> list:
        return [{"name": item, "level": "Fluent"} if isinstance(item, str) else item for item in v]


class UserProfileResponse(BaseModel):
    uid: str
    email: Optional[str] = None
    display_name: Optional[str] = None
    photo_url: Optional[str] = None
    email_verified: bool
    disabled: bool
    github_username: Optional[str] = None
    username: Optional[str] = None
    bio: Optional[str] = None
    social_links: Optional[SocialLinks] = None
    tech_stacks: list[str] = Field(default_factory=list)
    experiences: list[Experience] = Field(default_factory=list)
    projects: list[Project] = Field(default_factory=list)
    education: list[Education] = Field(default_factory=list)
    certifications: list[Certification] = Field(default_factory=list)
    portfolio_settings: Optional[PortfolioSettings] = None
    personal_info: Optional[PersonalInfo] = None
    onboarding_completed: bool = False


class UpdateProfileRequest(BaseModel):
    github_username: Optional[str] = None
    username: Optional[str] = None
    bio: Optional[str] = None
    social_links: Optional[SocialLinks] = None
    tech_stacks: Optional[list[str]] = None
    experiences: Optional[list[Experience]] = None
    projects: Optional[list[Project]] = None
    education: Optional[list[Education]] = None
    certifications: Optional[list[Certification]] = None
    portfolio_settings: Optional[PortfolioSettings] = None
    personal_info: Optional[PersonalInfo] = None


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
