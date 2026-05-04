from app.api.routes.tasks import services as task_svc
from app.api.routes.tasks.schema import TaskStatsOut
from app.utils.collection_name import (
    API_CLIENT_COLLECTIONS,
    API_CLIENT_ENVIRONMENTS,
    API_CLIENT_HISTORY,
    BOOKMARK_FOLDERS,
    BOOKMARKS,
    CODE_SNIPPETS,
    JSON_FORMATTER_DOCUMENTS,
    NOTES,
    NOSQL_CONNECTIONS,
    PASSWORD_ENTRIES,
    PROJECTS,
)
from app.api.routes.analytics.schema import DashboardAnalyticsOut
from app.database import db_manager


async def get_dashboard_analytics(uid: str) -> DashboardAnalyticsOut:
    base = {"created_by": uid}
    task_stats: TaskStatsOut = await task_svc.get_task_stats(uid)

    password_entries = await db_manager.count_documents(PASSWORD_ENTRIES, base)
    bookmarks = await db_manager.count_documents(BOOKMARKS, base)
    bookmark_folders = await db_manager.count_documents(BOOKMARK_FOLDERS, base)
    projects = await db_manager.count_documents(PROJECTS, base)

    nosql_filter = {
        **base,
        "encryptedData": {"$exists": True},
        "iv": {"$exists": True},
    }
    nosql_connections = await db_manager.count_documents(NOSQL_CONNECTIONS, nosql_filter)

    notes = await db_manager.count_documents(NOTES, base)
    api_collections = await db_manager.count_documents(API_CLIENT_COLLECTIONS, base)
    api_envs = await db_manager.count_documents(API_CLIENT_ENVIRONMENTS, base)
    api_history = await db_manager.count_documents(API_CLIENT_HISTORY, base)
    json_docs = await db_manager.count_documents(JSON_FORMATTER_DOCUMENTS, base)
    code_snippets = await db_manager.count_documents(CODE_SNIPPETS, base)

    return DashboardAnalyticsOut(
        passwordEntries=password_entries,
        bookmarks=bookmarks,
        bookmarkFolders=bookmark_folders,
        tasks=task_stats,
        projects=projects,
        nosqlConnections=nosql_connections,
        notes=notes,
        apiClientCollections=api_collections,
        apiClientEnvironments=api_envs,
        apiClientHistoryEntries=api_history,
        jsonFormatterDocuments=json_docs,
        codeSnippets=code_snippets,
    )
