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
from app.core.cache import bump_version, cached
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


def _task_filter(
    uid: str,
    status_filter: str | None = None,
    project_filter: str | None = None,
) -> dict[str, Any]:
    q: dict[str, Any] = {"created_by": uid}
    if status_filter and status_filter != "all":
        q["status"] = status_filter
    if project_filter and project_filter != "all":
        q["projectId"] = project_filter
    return q


@cached(ns="tasks", ttl=60, scope="user")
async def list_tasks(
    *,
    uid: str,
    status_filter: str = "all",
    project_filter: str = "all",
    page: int = 1,
    page_size: int = 10,
) -> TaskListResponse:
    filt = _task_filter(uid, status_filter, project_filter)
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


@cached(ns="tasks", ttl=60, scope="user")
async def get_task_stats(*, uid: str) -> TaskStatsOut:
    pipeline = [
        {"$match": {"created_by": uid}},
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


@cached(ns="tasks", ttl=60, scope="user")
async def export_tasks(
    *,
    uid: str,
    status_filter: str = "all",
    project_filter: str = "all",
    skip: int = 0,
    limit: int = 2000,
) -> list[TaskOut]:
    filt = _task_filter(uid, status_filter, project_filter)
    docs = await db_manager.find(
        TASKS,
        filt,
        sort=[("statusOrder", 1), ("createdAt", -1)],
        skip=max(0, skip),
        limit=max(1, limit),
    )
    return [_task_doc_to_out(d) for d in docs]


async def create_task(uid: str, body: TaskCreate) -> TaskOut:
    now = datetime.now(timezone.utc)
    doc: dict[str, Any] = {
        "created_by": uid,
        "text": body.text,
        "status": "not-started",
        "statusOrder": 2,
        "createdAt": now,
        "projectId": body.projectId,
    }
    await safe_insert(TASKS, doc, name="Task")
    await bump_version(ns="tasks", uid=uid)
    return _task_doc_to_out(doc)


async def _assert_task_owner(uid: str, oid: ObjectId) -> dict[str, Any]:
    doc = await db_manager.find_one(TASKS, {"_id": oid, "created_by": uid})
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found.")
    return doc


async def update_task(uid: str, task_id: str, body: TaskUpdate) -> TaskOut:
    oid = _parse_object_id(task_id, "task id")

    patch = body.model_dump(exclude_unset=True)
    patch.pop("id", None)
    patch.pop("completedAt", None)

    if body.status == "completed":
        patch["completedAt"] = datetime.now(timezone.utc)

    if not patch:
        doc = await db_manager.find_one(TASKS, {"_id": oid, "created_by": uid})
        if not doc:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found.")
        return _task_doc_to_out(doc)

    doc = await safe_update_one(
        TASKS, {"_id": oid, "created_by": uid}, patch, name="Task"
    )
    await bump_version(ns="tasks", uid=uid)
    return _task_doc_to_out(doc)


async def update_task_status(uid: str, task_id: str, body: TaskStatusUpdate) -> TaskOut:
    oid = _parse_object_id(task_id, "task id")
    new_status = body.status
    patch: dict[str, Any] = {
        "status": new_status,
        "statusOrder": STATUS_ORDER_MAP[new_status],
    }
    if new_status == "completed":
        patch["completedAt"] = datetime.now(timezone.utc)
    doc = await safe_update_one(
        TASKS, {"_id": oid, "created_by": uid}, patch, name="Task"
    )
    await bump_version(ns="tasks", uid=uid)
    return _task_doc_to_out(doc)


@cached(ns="tasks", ttl=60, scope="user")
async def get_task(*, uid: str, task_id: str) -> TaskOut:
    oid = _parse_object_id(task_id, "task id")
    doc = await _assert_task_owner(uid, oid)
    return _task_doc_to_out(doc)


async def delete_task(uid: str, task_id: str) -> None:
    oid = _parse_object_id(task_id, "task id")
    await safe_delete_one(TASKS, {"_id": oid, "created_by": uid}, name="Task")
    await bump_version(ns="tasks", uid=uid)


async def import_tasks(uid: str, body: TaskImportRequest) -> dict[str, int]:
    now = datetime.now(timezone.utc)
    docs: list[dict[str, Any]] = []
    for raw in body.tasks:
        row = dict(raw)
        row.pop("id", None)
        row.pop("createdAt", None)
        row.pop("completedAt", None)
        row["created_by"] = uid
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
    await bump_version(ns="tasks", uid=uid)
    return {"inserted": len(result.inserted_ids)}


@cached(ns="tasks", ttl=60, scope="user")
async def list_projects(*, uid: str) -> list[ProjectOut]:
    docs = await db_manager.find(PROJECTS, {"created_by": uid}, sort=[("createdAt", 1)])
    return [_project_doc_to_out(d) for d in docs]


async def create_project(uid: str, body: ProjectCreate) -> ProjectOut:
    now = datetime.now(timezone.utc)
    doc = {
        "created_by": uid,
        "name": body.name,
        "color": body.color,
        "createdAt": now,
    }
    await safe_insert(PROJECTS, doc, name="Project")
    await bump_version(ns="tasks", uid=uid)
    return _project_doc_to_out(doc)


async def update_project(uid: str, project_id: str, body: ProjectUpdate) -> ProjectOut:
    oid = _parse_object_id(project_id, "project id")
    patch = body.model_dump(exclude_unset=True)
    if not patch:
        doc = await db_manager.find_one(PROJECTS, {"_id": oid, "created_by": uid})
        if not doc:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found.")
        return _project_doc_to_out(doc)
    doc = await safe_update_one(
        PROJECTS, {"_id": oid, "created_by": uid}, patch, name="Project"
    )
    await bump_version(ns="tasks", uid=uid)
    return _project_doc_to_out(doc)


async def delete_project(uid: str, project_id: str) -> None:
    oid = _parse_object_id(project_id, "project id")
    await safe_delete_one(PROJECTS, {"_id": oid, "created_by": uid}, name="Project")
    await bump_version(ns="tasks", uid=uid)
