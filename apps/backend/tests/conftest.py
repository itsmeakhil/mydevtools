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

from app.api.routes.workspaces.seed import ensure_system_org
from app.api.routes.workspaces.services import ensure_user_workspace_setup
from app.database import db_manager
from app.utils.collection_name import (
    API_CLIENT_COLLECTIONS,
    API_CLIENT_ENVIRONMENTS,
    API_CLIENT_HISTORY,
    API_CLIENT_WORKSPACES,
    API_KEY_VAULT_ENTRIES,
    BOOKMARKS,
    BOOKMARK_FOLDERS,
    CODE_SNIPPETS,
    ENV_MANAGER_ENTRIES,
    JSON_FORMATTER_DOCUMENTS,
    NOSQL_CONNECTIONS,
    NOSQL_QUERY_HISTORY,
    NOTES,
    ORGANIZATIONS,
    ORG_MEMBERSHIPS,
    PASSWORD_ENTRIES,
    PASSWORD_VAULTS,
    PROJECTS,
    REDIS_CONNECTIONS,
    S3_CONNECTIONS,
    SQL_CONNECTIONS,
    TASKS,
    USER_PREFERENCES,
    USERS,
    WORKSPACES,
    WORKSPACE_MEMBERSHIPS,
    URL_LINKS,
    URL_CLICK_EVENTS,
)

pytest_plugins = ("pytest_asyncio",)


@pytest.fixture
async def clean_db():
    """Drop workspace-related collections and USERS before and after test."""
    collections = [API_CLIENT_COLLECTIONS, API_CLIENT_ENVIRONMENTS, API_CLIENT_HISTORY, API_CLIENT_WORKSPACES, API_KEY_VAULT_ENTRIES, ORGANIZATIONS, ORG_MEMBERSHIPS, WORKSPACES, WORKSPACE_MEMBERSHIPS, USERS, PASSWORD_ENTRIES, PASSWORD_VAULTS, NOTES, USER_PREFERENCES, BOOKMARKS, BOOKMARK_FOLDERS, TASKS, PROJECTS, ENV_MANAGER_ENTRIES, CODE_SNIPPETS, NOSQL_CONNECTIONS, NOSQL_QUERY_HISTORY, SQL_CONNECTIONS, S3_CONNECTIONS, REDIS_CONNECTIONS, URL_LINKS, URL_CLICK_EVENTS, JSON_FORMATTER_DOCUMENTS]

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


@pytest.fixture
async def seed_legacy_user_data():
    """Insert legacy test data (PASSWORD_ENTRIES + NOTES without workspace_id)."""
    # Create user document
    await db_manager.insert_one(
        USERS,
        {
            "_id": "u1",
            "uid": "u1",
            "email": "u1@example.com",
        },
    )

    # Insert legacy password entries
    await db_manager.insert_one(
        PASSWORD_ENTRIES,
        {
            "_id": "pe-1",
            "created_by": "u1",
            "name": "Test Password 1",
            "encrypted": "secret",
        },
    )
    await db_manager.insert_one(
        PASSWORD_ENTRIES,
        {
            "_id": "pe-2",
            "created_by": "u1",
            "name": "Test Password 2",
            "encrypted": "secret2",
        },
    )

    # Insert legacy notes
    await db_manager.insert_one(
        NOTES,
        {
            "_id": "note-1",
            "created_by": "u1",
            "title": "Test Note 1",
            "content": "Some content",
        },
    )
    await db_manager.insert_one(
        NOTES,
        {
            "_id": "note-2",
            "created_by": "u1",
            "title": "Test Note 2",
            "content": "More content",
        },
    )

    yield


@pytest.fixture
async def system_org_id():
    """Idempotently create the system org and return its id."""
    return await ensure_system_org()


@pytest.fixture
def personal_ws_for():
    """Return an async callable that creates (idempotently) a Personal workspace
    for the given uid and returns the workspace_id."""
    async def _ensure(uid: str) -> str:
        return await ensure_user_workspace_setup(uid)
    return _ensure
