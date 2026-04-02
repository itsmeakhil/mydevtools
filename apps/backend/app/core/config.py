from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    APP_NAME: str = "MyDevTools API"
    APP_ENV: str = "development"
    APP_DEBUG: bool = True
    APP_HOST: str = "0.0.0.0"
    APP_PORT: int = 8000

    FIREBASE_CREDENTIALS_JSON: str | None = None
    FIREBASE_CREDENTIALS_PATH: str | None = None

    MONGO_DB_URL: str = "mongodb://localhost:27017"
    MONGO_DB_NAME: str = "mydevtools"

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")


@lru_cache
def get_settings() -> Settings:
    return Settings()
