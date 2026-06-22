import os
from app.core.config import Settings


def test_cache_defaults():
    os.environ.pop("CACHE_ENABLED", None)
    os.environ.pop("CACHE_NAMESPACES", None)
    s = Settings(ALLOWED_ORIGINS="http://localhost", ACCESS_TOKEN_EXPIRE_MINUTES=30, REFRESH_TOKEN_EXPIRE_DAYS=7)
    assert s.REDIS_URL is None
    assert s.CACHE_ENABLED is True
    assert s.CACHE_NAMESPACES == ""
    assert s.CACHE_DEFAULT_TTL == 120
    assert s.CACHE_OP_TIMEOUT_MS == 50
    assert s.CACHE_XFETCH_BETA == 1.0
    assert s.CACHE_LOG_LEVEL == "WARNING"
