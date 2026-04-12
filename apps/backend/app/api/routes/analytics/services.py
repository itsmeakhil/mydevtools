from typing import Any

try:
    from pymongo.collection import Collection
except Exception:  # pragma: no cover
    Collection = Any  # type: ignore

from app.api.routes.tasks import services as task_svc
from app.api.routes.tasks.schema import TaskStatsOut
from app.core.db import get_db
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


def _col(name: str) -> Collection:
    return get_db()[name]


def get_dashboard_analytics(uid: str) -> DashboardAnalyticsOut:
    base = {"created_by": uid}
    task_stats: TaskStatsOut = task_svc.get_task_stats(uid)

    password_entries = _col(PASSWORD_ENTRIES).count_documents(base)
    bookmarks = _col(BOOKMARKS).count_documents(base)
    bookmark_folders = _col(BOOKMARK_FOLDERS).count_documents(base)
    projects = _col(PROJECTS).count_documents(base)

    nosql_filter = {
        **base,
        "encryptedData": {"$exists": True},
        "iv": {"$exists": True},
    }
    nosql_connections = _col(NOSQL_CONNECTIONS).count_documents(nosql_filter)

    notes = _col(NOTES).count_documents(base)
    api_collections = _col(API_CLIENT_COLLECTIONS).count_documents(base)
    api_envs = _col(API_CLIENT_ENVIRONMENTS).count_documents(base)
    api_history = _col(API_CLIENT_HISTORY).count_documents(base)
    json_docs = _col(JSON_FORMATTER_DOCUMENTS).count_documents(base)
    code_snippets = _col(CODE_SNIPPETS).count_documents(base)

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
