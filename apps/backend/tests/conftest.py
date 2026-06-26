import os
import pytest
from starlette.requests import Request
from starlette.datastructures import Headers

# Set required environment variables for tests BEFORE any imports
os.environ.setdefault("APP_ENV", "test")
os.environ.setdefault("APP_DEBUG", "true")
os.environ.setdefault("MONGO_DB_URL", "mongodb://localhost:27017")
os.environ.setdefault("MONGO_DB_NAME", "mydevtools_test")
os.environ.setdefault("JWT_SECRET_KEY", "test_secret_key_at_least_16_chars")
os.environ.setdefault("ACCESS_TOKEN_EXPIRE_MINUTES", "30")
os.environ.setdefault("REFRESH_TOKEN_EXPIRE_DAYS", "7")
os.environ.setdefault("ALLOWED_ORIGINS", "http://localhost:3000")
os.environ.setdefault("WEBAUTHN_RP_ID", "localhost")
os.environ.setdefault("WEBAUTHN_RP_NAME", "MyDevTools")
os.environ.setdefault("WEBAUTHN_ORIGINS", "http://localhost:3000")
os.environ.setdefault("WEBAUTHN_CHALLENGE_TTL_SECONDS", "300")

from app.database import db_manager
from app.utils.collection_name import (
    ORGANIZATIONS,
    ORG_MEMBERSHIPS,
    WORKSPACES,
    WORKSPACE_MEMBERSHIPS,
    USERS,
)

pytest_plugins = ("pytest_asyncio",)


@pytest.fixture
async def clean_db():
    """Drop workspace-related collections and USERS before and after test."""
    collections = [ORGANIZATIONS, ORG_MEMBERSHIPS, WORKSPACES, WORKSPACE_MEMBERSHIPS, USERS]

    # Clean before test
    for coll in collections:
        await db_manager.delete_many(coll, {})

    yield

    # Clean after test
    for coll in collections:
        await db_manager.delete_many(coll, {})


@pytest.fixture
def make_request():
    """Create a Starlette Request with optional cookies."""
    def _make_request(cookies=None):
        scope = {
            "type": "http",
            "method": "GET",
            "path": "/",
            "query_string": b"",
            "headers": [],
        }
        request = Request(scope)
        if cookies:
            request._cookies = cookies
        return request
    return _make_request


@pytest.fixture
def count_inserts():
    """Count db_manager.insert_one calls."""
    insert_count = {"count": 0}
    original_insert_one = db_manager.insert_one

    async def tracked_insert_one(*args, **kwargs):
        insert_count["count"] += 1
        return await original_insert_one(*args, **kwargs)

    db_manager.insert_one = tracked_insert_one

    def get_count():
        return insert_count["count"]

    yield get_count

    db_manager.insert_one = original_insert_one
