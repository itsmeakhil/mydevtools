from pymongo import MongoClient

from app.core.config import get_settings

_client: MongoClient | None = None


def get_mongo_client() -> MongoClient:
    global _client
    if _client is None:
        settings = get_settings()
        _client = MongoClient(settings.MONGO_DB_URL, maxIdleTimeMS=300000)
    return _client


def get_db():
    settings = get_settings()
    return get_mongo_client()[settings.MONGO_DB_NAME]
