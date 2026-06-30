import asyncio
import datetime

from app.api.routes.tasks import services as task_svc
from app.core.cache import cached
from app.utils.collection_name import (
    API_CLIENT_COLLECTIONS,
    API_CLIENT_ENVIRONMENTS,
    API_CLIENT_HISTORY,
    AUDIT_LOG,
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
from app.api.routes.workspaces.middleware import WorkspaceContext, apply_legacy_or_filter
from app.database import db_manager


@cached(ns="analytics_aggregate", ttl=300, scope="global", strategy="xfetch")
async def get_top_tools(*, days: int = 7, limit: int = 10) -> list[dict]:
    """Return the top N tools by event count across all users over the last ``days`` days."""
    since = datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(days=days)
    pipeline = [
        {"$match": {"module": {"$ne": None}, "ts": {"$gte": since.timestamp() * 1000}}},
        {"$group": {"_id": "$module", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": limit},
        {"$project": {"_id": 0, "tool": "$_id", "count": 1}},
    ]
    return await db_manager.aggregate(AUDIT_LOG, pipeline)


@cached(ns="analytics_aggregate", ttl=300, scope="global", strategy="xfetch")
async def get_activity_buckets(*, days: int = 7) -> list[dict]:
    """Return daily event counts across all users over the last ``days`` days."""
    since = datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(days=days)
    pipeline = [
        {"$match": {"ts": {"$gte": since.timestamp() * 1000}}},
        {
            "$group": {
                "_id": {
                    "$dateToString": {
                        "format": "%Y-%m-%d",
                        "date": {"$toDate": "$ts"},
                        "timezone": "UTC",
                    }
                },
                "count": {"$sum": 1},
            }
        },
        {"$sort": {"_id": 1}},
        {"$project": {"_id": 0, "date": "$_id", "count": 1}},
    ]
    return await db_manager.aggregate(AUDIT_LOG, pipeline)


async def get_dashboard_analytics(ctx: WorkspaceContext) -> DashboardAnalyticsOut:
    flt = lambda base=None: apply_legacy_or_filter(ctx, base or {}, user_field="created_by")
    nosql_filter = flt({"encryptedData": {"$exists": True}, "iv": {"$exists": True}})
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
        task_svc.get_task_stats(ctx=ctx),
        db_manager.count_documents(PASSWORD_ENTRIES, flt()),
        db_manager.count_documents(BOOKMARKS, flt()),
        db_manager.count_documents(BOOKMARK_FOLDERS, flt()),
        db_manager.count_documents(PROJECTS, flt()),
        db_manager.count_documents(NOSQL_CONNECTIONS, nosql_filter),
        db_manager.count_documents(NOTES, flt()),
        db_manager.count_documents(API_CLIENT_COLLECTIONS, flt()),
        db_manager.count_documents(API_CLIENT_ENVIRONMENTS, flt()),
        db_manager.count_documents(API_CLIENT_HISTORY, flt()),
        db_manager.count_documents(JSON_FORMATTER_DOCUMENTS, flt()),
        db_manager.count_documents(CODE_SNIPPETS, flt()),
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
