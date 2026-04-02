from datetime import datetime, timezone
from typing import Any

from bson import ObjectId
from bson.errors import InvalidId
from fastapi import HTTPException, status
from pymongo.collection import Collection
from pymongo.errors import PyMongoError
from app.utils.collection_name import TASKS, PROJECTS
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
from app.core.db import get_db

STATUS_ORDER_MAP: dict[TaskStatus, int] = {
    "ongoing": 1,
    "not-started": 2,
    "completed": 3,
}


def _tasks_col() -> Collection:
    return get_db()[TASKS]


def _projects_col() -> Collection:
    return get_db()[PROJECTS]


def _parse_object_id(task_id: str) -> ObjectId:
    try:
        return ObjectId(task_id)
    except InvalidId as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid task id.",
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
    task_id = str(oid) if oid is not None else ""
    return TaskOut(
        id=task_id,
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


def list_tasks(
    uid: str,
    *,
    status_filter: str = "all",
    project_filter: str = "all",
    page: int = 1,
    page_size: int = 10,
) -> TaskListResponse:
    filt = _task_filter(uid, status_filter, project_filter)
    col = _tasks_col()
    total = col.count_documents(filt)
    total_pages = max(1, (total + page_size - 1) // page_size) if total else 1
    skip = max(0, (page - 1) * page_size)
    cursor = (
        col.find(filt)
        .sort([("statusOrder", 1), ("createdAt", -1)])
        .skip(skip)
        .limit(page_size)
    )
    items = [_task_doc_to_out(d) for d in cursor]
    return TaskListResponse(
        items=items,
        page=page,
        page_size=page_size,
        total=total,
        total_pages=total_pages,
    )


def get_task_stats(uid: str) -> TaskStatsOut:
    col = _tasks_col()
    base = {"created_by": uid}
    return TaskStatsOut(
        total=col.count_documents(base),
        completed=col.count_documents({**base, "status": "completed"}),
        ongoing=col.count_documents({**base, "status": "ongoing"}),
        notStarted=col.count_documents({**base, "status": "not-started"}),
    )


def export_tasks(
    uid: str,
    *,
    status_filter: str = "all",
    project_filter: str = "all",
) -> list[TaskOut]:
    filt = _task_filter(uid, status_filter, project_filter)
    col = _tasks_col()
    cursor = col.find(filt).sort([("statusOrder", 1), ("createdAt", -1)])
    return [_task_doc_to_out(d) for d in cursor]


def create_task(uid: str, body: TaskCreate) -> TaskOut:
    now = datetime.now(timezone.utc)
    doc: dict[str, Any] = {
        "created_by": uid,
        "text": body.text,
        "status": "not-started",
        "statusOrder": 2,
        "createdAt": now,
        "projectId": body.projectId,
    }
    try:
        result = _tasks_col().insert_one(doc)
    except PyMongoError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create task.",
        ) from exc
    doc["_id"] = result.inserted_id
    return _task_doc_to_out(doc)


def _assert_task_owner(col: Collection, uid: str, oid: ObjectId) -> dict[str, Any]:
    doc = col.find_one({"_id": oid, "created_by": uid})
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found.")
    return doc


def update_task(uid: str, task_id: str, body: TaskUpdate) -> TaskOut:
    oid = _parse_object_id(task_id)
    col = _tasks_col()
    _assert_task_owner(col, uid, oid)

    patch = body.model_dump(exclude_unset=True)
    patch.pop("id", None)
    patch.pop("completedAt", None)

    if body.status == "completed":
        patch["completedAt"] = datetime.now(timezone.utc)

    if not patch:
        doc = col.find_one({"_id": oid})
        return _task_doc_to_out(doc)  # type: ignore[arg-type]

    try:
        col.update_one({"_id": oid, "created_by": uid}, {"$set": patch})
    except PyMongoError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update task.",
        ) from exc
    doc = col.find_one({"_id": oid})
    return _task_doc_to_out(doc)  # type: ignore[arg-type]


def update_task_status(uid: str, task_id: str, body: TaskStatusUpdate) -> TaskOut:
    oid = _parse_object_id(task_id)
    col = _tasks_col()
    _assert_task_owner(col, uid, oid)
    new_status = body.status
    patch: dict[str, Any] = {
        "status": new_status,
        "statusOrder": STATUS_ORDER_MAP[new_status],
    }
    if new_status == "completed":
        patch["completedAt"] = datetime.now(timezone.utc)
    try:
        col.update_one({"_id": oid, "created_by": uid}, {"$set": patch})
    except PyMongoError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update task status.",
        ) from exc
    doc = col.find_one({"_id": oid})
    return _task_doc_to_out(doc)  # type: ignore[arg-type]


def get_task(uid: str, task_id: str) -> TaskOut:
    oid = _parse_object_id(task_id)
    col = _tasks_col()
    doc = _assert_task_owner(col, uid, oid)
    return _task_doc_to_out(doc)


def delete_task(uid: str, task_id: str) -> None:
    oid = _parse_object_id(task_id)
    col = _tasks_col()
    result = col.delete_one({"_id": oid, "created_by": uid})
    if result.deleted_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found.")


def import_tasks(uid: str, body: TaskImportRequest) -> dict[str, int]:
    col = _tasks_col()
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
        result = col.insert_many(docs)
    except PyMongoError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to import tasks.",
        ) from exc
    return {"inserted": len(result.inserted_ids)}


def list_projects(uid: str) -> list[ProjectOut]:
    col = _projects_col()
    cursor = col.find({"created_by": uid}).sort("createdAt", 1)
    return [_project_doc_to_out(d) for d in cursor]


def create_project(uid: str, body: ProjectCreate) -> ProjectOut:
    now = datetime.now(timezone.utc)
    doc = {
        "created_by": uid,
        "name": body.name,
        "color": body.color,
        "createdAt": now,
    }
    try:
        result = _projects_col().insert_one(doc)
    except PyMongoError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create project.",
        ) from exc
    doc["_id"] = result.inserted_id
    return _project_doc_to_out(doc)


def _parse_project_id(project_id: str) -> ObjectId:
    try:
        return ObjectId(project_id)
    except InvalidId as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid project id.",
        ) from exc


def update_project(uid: str, project_id: str, body: ProjectUpdate) -> ProjectOut:
    oid = _parse_project_id(project_id)
    col = _projects_col()
    patch = body.model_dump(exclude_unset=True)
    if not patch:
        doc = col.find_one({"_id": oid, "created_by": uid})
        if not doc:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found.")
        return _project_doc_to_out(doc)
    result = col.update_one({"_id": oid, "created_by": uid}, {"$set": patch})
    if result.matched_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found.")
    doc = col.find_one({"_id": oid})
    return _project_doc_to_out(doc)  # type: ignore[arg-type]


def delete_project(uid: str, project_id: str) -> None:
    oid = _parse_project_id(project_id)
    col = _projects_col()
    result = col.delete_one({"_id": oid, "created_by": uid})
    if result.deleted_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found.")
