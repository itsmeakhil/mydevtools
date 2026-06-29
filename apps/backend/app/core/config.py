from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    APP_NAME: str = "MyDevTools API"
    APP_ENV: str = "development"
    APP_DEBUG: bool = True
    APP_HOST: str = "0.0.0.0"
    APP_PORT: int = 8000

    FIREBASE_CREDENTIALS_JSON: str | None = None

    MONGO_DB_URL: str = "mongodb://localhost:27017"
    MONGO_DB_NAME: str = "mydevtools"

    # HS256 secret for API JWTs (set a strong value in production).
    JWT_SECRET_KEY: str = Field(
        default="DEFAULT_DEV_JWT_SECRET_NOT_FOR_PRODUCTION",
        min_length=16,
    )
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int
    REFRESH_TOKEN_EXPIRE_DAYS: int 
    # HttpOnly cookies: use Secure=true over HTTPS (recommended in production).
    AUTH_COOKIE_SECURE: bool = False

    ALLOWED_ORIGINS: str

    # WebAuthn / passkeys
    WEBAUTHN_RP_ID: str
    WEBAUTHN_RP_NAME: str
    WEBAUTHN_ORIGINS: str
    WEBAUTHN_CHALLENGE_TTL_SECONDS: int

    # Email (Resend)
    RESEND_API_KEY: str | None = None
    INVITATION_FROM_EMAIL: str = "MyDevTools <invitations@mydevtools.tech>"
    APP_PUBLIC_URL: str = "http://localhost:3000"

    # Redis + cache
    REDIS_URL: str | None = None
    CACHE_ENABLED: bool = True
    CACHE_NAMESPACES: str = ""             # comma-separated; empty = no-op
    CACHE_DEFAULT_TTL: int = 120           # seconds
    CACHE_OP_TIMEOUT_MS: int = 50          # per Redis call
    CACHE_XFETCH_BETA: float = 1.0         # XFetch tuning constant
    CACHE_LOG_LEVEL: str = "WARNING"

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    def model_post_init(self, __context: object) -> None:  # type: ignore[override]
        dev_placeholder = "DEFAULT_DEV_JWT_SECRET_NOT_FOR_PRODUCTION"
        if self.APP_ENV == "production" and self.JWT_SECRET_KEY == dev_placeholder:
            raise ValueError(
                "JWT_SECRET_KEY must be set in the environment when APP_ENV=production",
            )
        if self.APP_ENV == "production" and not self.AUTH_COOKIE_SECURE:
            raise ValueError(
                "AUTH_COOKIE_SECURE must be true when APP_ENV=production",
            )
        # L-2 fix: prevent debug mode in production
        if self.APP_ENV == "production" and self.APP_DEBUG:
            raise ValueError(
                "APP_DEBUG must be false when APP_ENV=production",
            )


@lru_cache
def get_settings() -> Settings:
    return Settings()
