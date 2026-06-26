import pytest
from app.database import db_manager
from app.utils.collection_name import (
    ORGANIZATIONS,
    ORG_MEMBERSHIPS,
    WORKSPACES,
    WORKSPACE_MEMBERSHIPS,
)

pytest_plugins = ("pytest_asyncio",)


@pytest.fixture(autouse=False, scope="function")
async def clean_db():
    """Drop workspace-related collections before and after test."""
    collections = [ORGANIZATIONS, ORG_MEMBERSHIPS, WORKSPACES, WORKSPACE_MEMBERSHIPS]

    # Clean before test
    for coll in collections:
        await db_manager.delete_many(coll, {})

    yield

    # Clean after test
    for coll in collections:
        await db_manager.delete_many(coll, {})
