from typing import Any

from app.core.config import get_settings
from motor.motor_asyncio import AsyncIOMotorClient
_client: Any = None


def get_mongo_client():
    global _client
    if _client is None:
        settings = get_settings()
        _client = AsyncIOMotorClient(settings.MONGO_DB_URL, maxIdleTimeMS=300000)
    return _client


def get_db():
    settings = get_settings()
    return get_mongo_client()[settings.MONGO_DB_NAME]
