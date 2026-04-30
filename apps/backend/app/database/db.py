from typing import Any

from app.core.config import get_settings

# Import PyMongo lazily to keep unit tests lightweight.
_client: Any = None


def get_mongo_client():
    global _client
    if _client is None:
        settings = get_settings()
        try:
            from pymongo import MongoClient  # type: ignore
        except Exception as exc:  # pragma: no cover
            raise RuntimeError(
                "MongoDB client is unavailable. Ensure PyMongo dependencies are installed and compatible."
            ) from exc
        _client = MongoClient(settings.MONGO_DB_URL, maxIdleTimeMS=300000)
    return _client


def get_db():
    settings = get_settings()
    client = get_mongo_client()
    return client[settings.MONGO_DB_NAME]
