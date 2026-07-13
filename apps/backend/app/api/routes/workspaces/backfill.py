from dataclasses import dataclass
from typing import Any

from fastapi import BackgroundTasks

from app.api.routes.auth import users_repo
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
    PASSWORD_ENTRIES,
    PASSWORD_VAULTS,
    PROJECTS,
    REDIS_CONNECTIONS,
    S3_CONNECTIONS,
    SQL_CONNECTIONS,
    TASKS,
    URL_LINKS,
    USER_PREFERENCES,
)


@dataclass(frozen=True)
class BackfillSpec:
    collection: str
    user_field: str
    stamp_owner_uid: bool


BACKFILL_COLLECTIONS: list[BackfillSpec] = [
    BackfillSpec(PASSWORD_VAULTS, "created_by", True),
    BackfillSpec(PASSWORD_ENTRIES, "created_by", True),
    BackfillSpec(ENV_MANAGER_ENTRIES, "created_by", True),
    BackfillSpec(API_KEY_VAULT_ENTRIES, "created_by", True),
    BackfillSpec(NOTES, "created_by", True),
    BackfillSpec(TASKS, "created_by", True),
    BackfillSpec(PROJECTS, "created_by", True),
    BackfillSpec(BOOKMARKS, "created_by", True),
    BackfillSpec(BOOKMARK_FOLDERS, "created_by", True),
    BackfillSpec(CODE_SNIPPETS, "created_by", True),
    BackfillSpec(NOSQL_CONNECTIONS, "created_by", True),
    BackfillSpec(NOSQL_QUERY_HISTORY, "created_by", True),
    BackfillSpec(API_CLIENT_COLLECTIONS, "created_by", True),
    BackfillSpec(API_CLIENT_ENVIRONMENTS, "created_by", True),
    BackfillSpec(API_CLIENT_HISTORY, "created_by", True),
    BackfillSpec(API_CLIENT_WORKSPACES, "created_by", True),
    BackfillSpec(SQL_CONNECTIONS, "created_by", True),
    BackfillSpec(S3_CONNECTIONS, "created_by", True),
    BackfillSpec(REDIS_CONNECTIONS, "created_by", True),
    BackfillSpec(URL_LINKS, "created_by", True),
    BackfillSpec(JSON_FORMATTER_DOCUMENTS, "created_by", True),
]


async def _stamp_collection(spec: BackfillSpec, uid: str, ws_id: str) -> int:
    update: dict[str, Any] = {"workspace_id": ws_id}
    if spec.stamp_owner_uid:
        update["owner_uid"] = uid
    res = await db_manager.update_many(
        spec.collection,
        {spec.user_field: uid, "workspace_id": {"$exists": False}},
        {"$set": update},
    )
    return getattr(res, "modified_count", 0)


async def _rewrite_pinned_tools(uid: str, ws_id: str) -> None:
    pref = await db_manager.find_one(USER_PREFERENCES, {"_id": uid})
    if not pref:
        return
    legacy = pref.get("toolFavorites")
    if legacy is None:
        return
    keyed = pref.get("pinnedToolsByWorkspace") or {}
    keyed[ws_id] = list(legacy)
    await db_manager.update_one(
        USER_PREFERENCES,
        {"_id": uid},
        {
            "$set": {"pinnedToolsByWorkspace": keyed},
            "$unset": {"toolFavorites": ""},
        },
    )


async def run_user_backfill(uid: str, personal_workspace_id: str) -> None:
    # Skip if already migrated
    migrated_at = await users_repo.get_migrated_at(uid)
    if migrated_at:
        return

    progress = await users_repo.get_migration_progress(uid) or {}
    for spec in BACKFILL_COLLECTIONS:
        if progress.get(spec.collection) == "done":
            continue
        await _stamp_collection(spec, uid, personal_workspace_id)
        progress[spec.collection] = "done"
        await users_repo.set_migration_progress(uid, progress)

    await _rewrite_pinned_tools(uid, personal_workspace_id)
    await users_repo.mark_migrated(uid)


def schedule_backfill(
    background_tasks: BackgroundTasks,
    uid: str,
    personal_workspace_id: str,
) -> None:
    background_tasks.add_task(run_user_backfill, uid, personal_workspace_id)
