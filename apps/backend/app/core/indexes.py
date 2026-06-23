from app.database import db_manager
from app.utils.collection_name import (
    API_CLIENT_HISTORY,
    API_CLIENT_COLLECTIONS,
    API_CLIENT_ENVIRONMENTS,
    AUDIT_LOG,
    BOOKMARK_FOLDERS,
    BOOKMARKS,
    CODE_SNIPPETS,
    ENV_MANAGER_ENTRIES,
    FEEDBACK,
    GAME_SCORES,
    JSON_FORMATTER_DOCUMENTS,
    NOTES,
    NOSQL_CONNECTIONS,
    NOSQL_QUERY_HISTORY,
    PASSWORD_ENTRIES,
    PROJECTS,
    REDIS_CONNECTIONS,
    S3_CONNECTIONS,
    SQL_CONNECTIONS,
    TASKS,
    URL_CLICK_EVENTS,
    URL_LINKS,
    USER_PREFERENCES,
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
    await db_manager.create_index(JSON_FORMATTER_DOCUMENTS, [("created_by", 1), ("updatedAt", -1)])
    await db_manager.create_index(API_CLIENT_HISTORY, [("created_by", 1), ("timestamp", -1)])
    await db_manager.create_index(API_CLIENT_COLLECTIONS, [("created_by", 1), ("name", 1), ("_id", 1)])
    await db_manager.create_index(API_CLIENT_ENVIRONMENTS, [("created_by", 1), ("name", 1), ("_id", 1)])
    await db_manager.create_index(PASSWORD_ENTRIES, [("created_by", 1), ("updatedAt", -1)])
    await db_manager.create_index(ENV_MANAGER_ENTRIES, [("created_by", 1), ("updatedAt", -1)])
    await db_manager.create_index(NOSQL_CONNECTIONS, [("created_by", 1), ("updatedAt", -1)])
    await db_manager.create_index(NOSQL_QUERY_HISTORY, [("created_by", 1), ("createdAt", -1)])
    await db_manager.create_index(USER_PREFERENCES, "created_by")
    await db_manager.create_index(SQL_CONNECTIONS, [("created_by", 1), ("updatedAt", -1)])
    await db_manager.create_index(S3_CONNECTIONS, [("created_by", 1), ("updatedAt", -1)])
    await db_manager.create_index(REDIS_CONNECTIONS, [("created_by", 1), ("updatedAt", -1)])
    await db_manager.create_index(GAME_SCORES, [("created_by", 1), ("updatedAt", -1)])
    await db_manager.create_index(FEEDBACK, [("created_by", 1), ("createdAt", -1)])
    await db_manager.create_index(URL_LINKS, [("created_by", 1), ("created_at", -1)])
    await db_manager.create_index(URL_CLICK_EVENTS, [("code", 1), ("ts", -1)])
    # ponytail: TTL via expireAt BSON Date (ts is int millis, not Date); 90d retention
    await db_manager.create_index(URL_CLICK_EVENTS, "expireAt", expire_after_seconds=0)
    await db_manager.create_index(AUDIT_LOG, [("uid", 1), ("ts", -1)])
    await db_manager.create_index(AUDIT_LOG, [("uid", 1), ("module", 1), ("ts", -1)])
    await db_manager.create_index(AUDIT_LOG, "expireAt", expire_after_seconds=0)
