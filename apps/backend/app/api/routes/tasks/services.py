from datetime import datetime, timezone
from typing import Any

from bson import ObjectId
from bson.errors import InvalidId
from fastapi import HTTPException, status
from pymongo.errors import PyMongoError

from app.api.routes.tasks.schema import (
    ProjectCreate,
    ProjectOut,
    ProjectUpdate,
    TaskCreate,
    TaskImportRequest,
    TaskListResponse,
    TaskOut,
    TaskStatsOut,
    TaskStatus,
    TaskStatusUpdate,
    TaskUpdate,
)
from app.api.routes.workspaces.middleware import (
    WorkspaceContext,
    apply_legacy_or_filter,
    apply_workspace_filter,
)
from app.database import db_manager
from app.utils.collection_name import PROJECTS, TASKS
from app.utils.crud import safe_delete_one, safe_insert, safe_update_one

STATUS_ORDER_MAP: dict[TaskStatus, int] = {
    "ongoing": 1,
    "not-started": 2,
    "completed": 3,
}


def _parse_object_id(raw: str, label: str = "id") -> ObjectId:
    try:
        return ObjectId(raw)
    except InvalidId as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid {label}.",
        ) from exc


def _format_timestamp(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, datetime):
        if value.tzinfo is None:
            value = value.replace(tzinfo=timezone.utc)
        return value.astimezone(timezone.utc).isoformat()
    if isinstance(value, str):
        return value
    return str(value)


def _task_doc_to_out(doc: dict[str, Any]) -> TaskOut:
    oid = doc.get("_id")
    return TaskOut(
        id=str(oid) if oid is not None else "",
        text=doc.get("text", ""),
        description=doc.get("description"),
        status=doc["status"],
        statusOrder=int(doc.get("statusOrder", 2)),
        priority=doc.get("priority"),
        dueDate=doc.get("dueDate"),
        tags=doc.get("tags"),
        subTasks=doc.get("subTasks"),
        createdAt=_format_timestamp(doc.get("createdAt")) or "",
        completedAt=_format_timestamp(doc.get("completedAt")) or None,
        created_by=doc.get("created_by", ""),
        archived=doc.get("archived"),
        timeEstimate=doc.get("timeEstimate"),
        timeLogged=doc.get("timeLogged"),
        isTimerRunning=doc.get("isTimerRunning"),
        timerStartedAt=doc.get("timerStartedAt"),
        projectId=doc.get("projectId"),
    )


def _project_doc_to_out(doc: dict[str, Any]) -> ProjectOut:
    oid = doc.get("_id")
    return ProjectOut(
        id=str(oid) if oid is not None else "",
        name=doc.get("name", ""),
        color=doc.get("color", ""),
        created_by=doc.get("created_by", ""),
        createdAt=_format_timestamp(doc.get("createdAt")) or "",
    )


# ponytail: cache removed during workspace refactor; re-add with (workspace_id, uid) key if hot
async def list_tasks(
    *,
    ctx: WorkspaceContext,
    status_filter: str = "all",
    project_filter: str = "all",
    page: int = 1,
    page_size: int = 10,
) -> TaskListResponse:
    base: dict[str, Any] = {}
    if status_filter and status_filter != "all":
        base["status"] = status_filter
    if project_filter and project_filter != "all":
        base["projectId"] = project_filter
    filt = apply_legacy_or_filter(ctx, base, user_field="created_by")
    total = await db_manager.count_documents(TASKS, filt)
    total_pages = max(1, (total + page_size - 1) // page_size) if total else 1
    skip = max(0, (page - 1) * page_size)
    docs = await db_manager.find(TASKS, filt, sort=[("statusOrder", 1), ("createdAt", -1)], skip=skip, limit=page_size)
    return TaskListResponse(
        items=[_task_doc_to_out(d) for d in docs],
        page=page,
        page_size=page_size,
        total=total,
        total_pages=total_pages,
    )


# ponytail: cache removed during workspace refactor; re-add with (workspace_id, uid) key if hot
async def get_task_stats(*, ctx: WorkspaceContext) -> TaskStatsOut:
    filt = apply_legacy_or_filter(ctx, {}, user_field="created_by")
    pipeline = [
        {"$match": filt},
        {"$group": {"_id": "$status", "count": {"$sum": 1}}},
    ]
    rows = await db_manager.aggregate(TASKS, pipeline)
    counts: dict[str, int] = {r["_id"]: r["count"] for r in rows}
    return TaskStatsOut(
        total=sum(counts.values()),
        completed=counts.get("completed", 0),
        ongoing=counts.get("ongoing", 0),
        notStarted=counts.get("not-started", 0),
    )


# ponytail: cache removed during workspace refactor; re-add with (workspace_id, uid) key if hot
async def export_tasks(
    *,
    ctx: WorkspaceContext,
    status_filter: str = "all",
    project_filter: str = "all",
    skip: int = 0,
    limit: int = 2000,
) -> list[TaskOut]:
    base: dict[str, Any] = {}
    if status_filter and status_filter != "all":
        base["status"] = status_filter
    if project_filter and project_filter != "all":
        base["projectId"] = project_filter
    filt = apply_legacy_or_filter(ctx, base, user_field="created_by")
    docs = await db_manager.find(
        TASKS,
        filt,
        sort=[("statusOrder", 1), ("createdAt", -1)],
        skip=max(0, skip),
        limit=max(1, limit),
    )
    return [_task_doc_to_out(d) for d in docs]


async def create_task(ctx: WorkspaceContext, body: TaskCreate) -> TaskOut:
    now = datetime.now(timezone.utc)
    doc: dict[str, Any] = {
        "created_by": ctx.uid,
        "org_id": ctx.org_id,
        "workspace_id": ctx.workspace_id,
        "owner_uid": ctx.uid,
        "text": body.text,
        "status": "not-started",
        "statusOrder": 2,
        "createdAt": now,
        "projectId": body.projectId,
    }
    await safe_insert(TASKS, doc, name="Task")
    return _task_doc_to_out(doc)


async def _assert_task_owner(ctx: WorkspaceContext, oid: ObjectId) -> dict[str, Any]:
    filt = apply_workspace_filter(ctx, {"_id": oid, "created_by": ctx.uid})
    doc = await db_manager.find_one(TASKS, filt)
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found.")
    return doc


async def update_task(ctx: WorkspaceContext, task_id: str, body: TaskUpdate) -> TaskOut:
    oid = _parse_object_id(task_id, "task id")

    patch = body.model_dump(exclude_unset=True)
    patch.pop("id", None)
    patch.pop("completedAt", None)

    if body.status == "completed":
        patch["completedAt"] = datetime.now(timezone.utc)

    if not patch:
        filt = apply_workspace_filter(ctx, {"_id": oid, "created_by": ctx.uid})
        doc = await db_manager.find_one(TASKS, filt)
        if not doc:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found.")
        return _task_doc_to_out(doc)

    filt = apply_workspace_filter(ctx, {"_id": oid, "created_by": ctx.uid})
    doc = await safe_update_one(TASKS, filt, patch, name="Task")
    return _task_doc_to_out(doc)


async def update_task_status(ctx: WorkspaceContext, task_id: str, body: TaskStatusUpdate) -> TaskOut:
    oid = _parse_object_id(task_id, "task id")
    new_status = body.status
    patch: dict[str, Any] = {
        "status": new_status,
        "statusOrder": STATUS_ORDER_MAP[new_status],
    }
    if new_status == "completed":
        patch["completedAt"] = datetime.now(timezone.utc)
    filt = apply_workspace_filter(ctx, {"_id": oid, "created_by": ctx.uid})
    doc = await safe_update_one(TASKS, filt, patch, name="Task")
    return _task_doc_to_out(doc)


# ponytail: cache removed during workspace refactor; re-add with (workspace_id, uid) key if hot
async def get_task(*, ctx: WorkspaceContext, task_id: str) -> TaskOut:
    oid = _parse_object_id(task_id, "task id")
    doc = await _assert_task_owner(ctx, oid)
    return _task_doc_to_out(doc)


async def delete_task(ctx: WorkspaceContext, task_id: str) -> None:
    oid = _parse_object_id(task_id, "task id")
    filt = apply_workspace_filter(ctx, {"_id": oid, "created_by": ctx.uid})
    await safe_delete_one(TASKS, filt, name="Task")


async def import_tasks(ctx: WorkspaceContext, body: TaskImportRequest) -> dict[str, int]:
    now = datetime.now(timezone.utc)
    docs: list[dict[str, Any]] = []
    for raw in body.tasks:
        row = dict(raw)
        row.pop("id", None)
        row.pop("createdAt", None)
        row.pop("completedAt", None)
        row["created_by"] = ctx.uid
        row["org_id"] = ctx.org_id
        row["workspace_id"] = ctx.workspace_id
        row["owner_uid"] = ctx.uid
        row["createdAt"] = now
        if row.get("status") not in ("not-started", "ongoing", "completed"):
            row["status"] = "not-started"
        if "statusOrder" not in row:
            row["statusOrder"] = STATUS_ORDER_MAP.get(row["status"], 2)
        if raw.get("completedAt"):
            row["completedAt"] = now
        docs.append(row)
    if not docs:
        return {"inserted": 0}
    try:
        result = await db_manager.insert_many(TASKS, docs)
    except PyMongoError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to import tasks."
        ) from exc
    return {"inserted": len(result.inserted_ids)}


# ponytail: cache removed during workspace refactor; re-add with (workspace_id, uid) key if hot
async def list_projects(*, ctx: WorkspaceContext) -> list[ProjectOut]:
    filt = apply_legacy_or_filter(ctx, {}, user_field="created_by")
    docs = await db_manager.find(PROJECTS, filt, sort=[("createdAt", 1)])
    return [_project_doc_to_out(d) for d in docs]


async def create_project(ctx: WorkspaceContext, body: ProjectCreate) -> ProjectOut:
    now = datetime.now(timezone.utc)
    doc = {
        "created_by": ctx.uid,
        "org_id": ctx.org_id,
        "workspace_id": ctx.workspace_id,
        "owner_uid": ctx.uid,
        "name": body.name,
        "color": body.color,
        "createdAt": now,
    }
    await safe_insert(PROJECTS, doc, name="Project")
    return _project_doc_to_out(doc)


async def update_project(ctx: WorkspaceContext, project_id: str, body: ProjectUpdate) -> ProjectOut:
    oid = _parse_object_id(project_id, "project id")
    patch = body.model_dump(exclude_unset=True)
    if not patch:
        filt = apply_workspace_filter(ctx, {"_id": oid, "created_by": ctx.uid})
        doc = await db_manager.find_one(PROJECTS, filt)
        if not doc:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found.")
        return _project_doc_to_out(doc)
    filt = apply_workspace_filter(ctx, {"_id": oid, "created_by": ctx.uid})
    doc = await safe_update_one(PROJECTS, filt, patch, name="Project")
    return _project_doc_to_out(doc)


async def delete_project(ctx: WorkspaceContext, project_id: str) -> None:
    oid = _parse_object_id(project_id, "project id")
    filt = apply_workspace_filter(ctx, {"_id": oid, "created_by": ctx.uid})
    await safe_delete_one(PROJECTS, filt, name="Project")
