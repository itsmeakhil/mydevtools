from app.database import db_manager
from app.utils.collection_name import (
    API_CLIENT_HISTORY,
    API_CLIENT_COLLECTIONS,
    API_CLIENT_ENVIRONMENTS,
    BOOKMARK_FOLDERS,
    BOOKMARKS,
    CODE_SNIPPETS,
    NOTES,
    PROJECTS,
    TASKS,
    USERS,
)


async def ensure_indexes() -> None:
    await db_manager.create_index(USERS, "refresh_token_hash", sparse=True)
    await db_manager.create_index(USERS, "username", unique=True, sparse=True)

    await db_manager.create_index(TASKS, [("created_by", 1), ("status", 1), ("statusOrder", 1), ("createdAt", -1)])
    await db_manager.create_index(TASKS, [("created_by", 1), ("projectId", 1), ("status", 1), ("statusOrder", 1)])
    await db_manager.create_index(PROJECTS, [("created_by", 1), ("createdAt", 1)])

    await db_manager.create_index(BOOKMARKS, [("created_by", 1), ("folderId", 1)])
    await db_manager.create_index(BOOKMARKS, [("created_by", 1), ("updatedAt", -1)])
    await db_manager.create_index(BOOKMARK_FOLDERS, [("created_by", 1), ("parentId", 1)])
    await db_manager.create_index(BOOKMARK_FOLDERS, [("created_by", 1), ("createdAt", 1)])
    await db_manager.create_index(CODE_SNIPPETS, [("created_by", 1), ("updatedAt", -1)])
    await db_manager.create_index(NOTES, [("created_by", 1), ("updatedAt", -1)])
    await db_manager.create_index(API_CLIENT_HISTORY, [("created_by", 1), ("timestamp", -1)])
    await db_manager.create_index(API_CLIENT_COLLECTIONS, [("created_by", 1), ("name", 1), ("_id", 1)])
    await db_manager.create_index(API_CLIENT_ENVIRONMENTS, [("created_by", 1), ("name", 1), ("_id", 1)])
