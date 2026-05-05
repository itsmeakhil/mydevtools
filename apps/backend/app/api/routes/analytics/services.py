import asyncio

from app.api.routes.tasks import services as task_svc
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
    nosql_filter = {
        **base,
        "encryptedData": {"$exists": True},
        "iv": {"$exists": True},
    }
    (
        task_stats,
        password_entries,
        bookmarks,
        bookmark_folders,
        projects,
        nosql_connections,
        notes,
        api_collections,
        api_envs,
        api_history,
        json_docs,
        code_snippets,
    ) = await asyncio.gather(
        task_svc.get_task_stats(uid),
        db_manager.count_documents(PASSWORD_ENTRIES, base),
        db_manager.count_documents(BOOKMARKS, base),
        db_manager.count_documents(BOOKMARK_FOLDERS, base),
        db_manager.count_documents(PROJECTS, base),
        db_manager.count_documents(NOSQL_CONNECTIONS, nosql_filter),
        db_manager.count_documents(NOTES, base),
        db_manager.count_documents(API_CLIENT_COLLECTIONS, base),
        db_manager.count_documents(API_CLIENT_ENVIRONMENTS, base),
        db_manager.count_documents(API_CLIENT_HISTORY, base),
        db_manager.count_documents(JSON_FORMATTER_DOCUMENTS, base),
        db_manager.count_documents(CODE_SNIPPETS, base),
    )

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
