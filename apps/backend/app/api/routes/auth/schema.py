
from pydantic import BaseModel, ConfigDict, Field, field_validator


class SessionRequest(BaseModel):
    """Exchange a Firebase ID token once; API returns HttpOnly cookies (no JWT in JSON)."""

    id_token: str = Field(min_length=1)
    check_revoked: bool = True


class SocialLinks(BaseModel):
    website: str | None = None
    twitter: str | None = None
    instagram: str | None = None
    linkedin: str | None = None
    youtube: str | None = None
    devto: str | None = None
    hashnode: str | None = None
    github: str | None = None


class Experience(BaseModel):
    id: str
    company: str
    role: str
    startDate: str
    endDate: str | None = None
    description: str | None = None
    technologies: list[str] = Field(default_factory=list)
    employmentType: str | None = None
    location: str | None = None


class Project(BaseModel):
    id: str
    title: str
    description: str
    imageUrl: str | None = None
    githubUrl: str | None = None
    liveUrl: str | None = None
    technologies: list[str] = Field(default_factory=list)


class Education(BaseModel):
    id: str
    institution: str
    degree: str
    startDate: str
    endDate: str | None = None
    description: str | None = None


class PortfolioSettings(BaseModel):
    theme: str | None = "bento"
    font: str | None = "sans"
    accentColor: str | None = "#3b82f6"
    rssFeedUrl: str | None = None
    showGithubStats: bool = True
    resumePdfUrl: str | None = None



class Language(BaseModel):
    name: str
    level: str = "Fluent"


class Certification(BaseModel):
    id: str
    name: str
    issuer: str
    issueDate: str | None = None
    expiryDate: str | None = None
    credentialUrl: str | None = None


class PersonalInfo(BaseModel):
    phone: str | None = None
    location: str | None = None
    date_of_birth: str | None = None
    nationality: str | None = None
    headline: str | None = None
    languages: list[Language] = Field(default_factory=list)
    hobbies: list[str] = Field(default_factory=list)

    @field_validator("languages", mode="before")
    @classmethod
    def coerce_languages(cls, v: list) -> list:
        return [{"name": item, "level": "Fluent"} if isinstance(item, str) else item for item in v]


class UserProfileResponse(BaseModel):
    uid: str
    email: str | None = None
    display_name: str | None = None
    photo_url: str | None = None
    email_verified: bool
    disabled: bool
    github_username: str | None = None
    username: str | None = None
    bio: str | None = None
    social_links: SocialLinks | None = None
    tech_stacks: list[str] = Field(default_factory=list)
    experiences: list[Experience] = Field(default_factory=list)
    projects: list[Project] = Field(default_factory=list)
    education: list[Education] = Field(default_factory=list)
    certifications: list[Certification] = Field(default_factory=list)
    portfolio_settings: PortfolioSettings | None = None
    personal_info: PersonalInfo | None = None
    # Role picked during onboarding (frontend/backend/fullstack/devops/qa/designer/exploring)
    persona: str | None = None
    onboarding_completed: bool = False
    # Workspace migration fields (T25)
    workspace_setup_at: int | None = None
    migrated_at: int | None = None
    migration_status: str | None = None
    migration_progress: dict | None = None


class UpdateProfileRequest(BaseModel):
    github_username: str | None = None
    username: str | None = None
    bio: str | None = None
    social_links: SocialLinks | None = None
    tech_stacks: list[str] | None = None
    experiences: list[Experience] | None = None
    projects: list[Project] | None = None
    education: list[Education] | None = None
    certifications: list[Certification] | None = None
    portfolio_settings: PortfolioSettings | None = None
    personal_info: PersonalInfo | None = None
    persona: str | None = None


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
