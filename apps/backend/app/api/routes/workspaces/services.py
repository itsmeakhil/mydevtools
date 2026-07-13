from fastapi import BackgroundTasks

from app.api.routes.auth import users_repo
from app.api.routes.workspaces.repo import (
    upsert_personal_workspace,
    upsert_ws_membership,
)
from app.api.routes.workspaces.backfill import schedule_backfill


async def ensure_user_workspace_setup(
    uid: str,
    background_tasks: BackgroundTasks | None = None,
) -> str:
    """Idempotently create the user's Personal workspace.
    Returns the user's Personal workspace_id.
    """
    setup_at = await users_repo.get_workspace_setup_at(uid)
    if setup_at:
        ws_id = await users_repo.get_personal_workspace_id(uid)
        if ws_id:
            return ws_id

    ws_id = await upsert_personal_workspace(uid)
    await upsert_ws_membership(ws_id, uid, "admin")

    await users_repo.mark_workspace_setup(uid, ws_id)

    migrated_at = await users_repo.get_migrated_at(uid)
    if not migrated_at:
        await users_repo.mark_migration_pending(uid)
        if background_tasks is not None:
            schedule_backfill(background_tasks, uid, ws_id)

    return ws_id
