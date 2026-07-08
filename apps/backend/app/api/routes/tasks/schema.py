"""
MongoDB document layout mirrors the Firestore collections used by the web todo app.

Collections
-----------
- ``tasks`` — same logical model as Firestore ``tasks`` (per-user documents).
- ``projects`` — same logical model as Firestore ``projects``.

Field names use camelCase where the frontend uses camelCase (``statusOrder``, ``projectId``,
``createdAt``, ``completedAt``, etc.) and ``created_by`` for the Firebase UID, matching
``TaskContext`` / ``ProjectContext``.

Recommended MongoDB indexes (create once in production)
-------------------------------------------------------
Tasks (match query patterns in ``TaskContext``)::

    db.tasks.create_index(
        [("created_by", 1), ("status", 1), ("statusOrder", 1), ("createdAt", -1)]
    )
    db.tasks.create_index(
        [("created_by", 1), ("projectId", 1), ("status", 1), ("statusOrder", 1), ("createdAt", -1)]
    )

Projects::

    db.projects.create_index([("created_by", 1), ("createdAt", 1)])
"""

from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field

TaskStatus = Literal["not-started", "ongoing", "completed"]
TaskPriority = Literal["low", "medium", "high"]


class SubTask(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str
    text: str
    completed: bool


class TaskTag(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str
    name: str
    color: str


class TaskBase(BaseModel):
    """Writable task fields (aligned with ``NewTask`` / Firestore writes)."""

    text: str = Field(min_length=1)
    description: str | None = None
    status: TaskStatus = "not-started"
    statusOrder: int = 2
    priority: TaskPriority | None = None
    dueDate: str | None = None
    tags: list[TaskTag] | None = None
    subTasks: list[SubTask] | None = None
    archived: bool | None = None
    timeEstimate: int | None = None
    timeLogged: int | None = None
    isTimerRunning: bool | None = None
    timerStartedAt: str | None = None
    projectId: str | None = None
    # Single assignee (a workspace member uid). None = unassigned.
    assigneeUid: str | None = None


class TaskCreate(BaseModel):
    """Maps to ``addTask``: title + optional project / assignee."""

    text: str = Field(min_length=1)
    projectId: str | None = None
    assigneeUid: str | None = None


class TaskUpdate(BaseModel):
    """
    Partial update; maps to ``updateTask`` (id / created_by / createdAt must not be sent).
    Server sets ``completedAt`` when status becomes ``completed`` if omitted.
    """

    model_config = ConfigDict(extra="ignore")

    text: str | None = None
    description: str | None = None
    status: TaskStatus | None = None
    statusOrder: int | None = None
    priority: TaskPriority | None = None
    dueDate: str | None = None
    tags: list[TaskTag] | None = None
    subTasks: list[SubTask] | None = None
    archived: bool | None = None
    timeEstimate: int | None = None
    timeLogged: int | None = None
    isTimerRunning: bool | None = None
    timerStartedAt: str | None = None
    projectId: str | None = None
    assigneeUid: str | None = None


class TaskStatusUpdate(BaseModel):
    """Maps to ``updateTaskStatus`` (status + derived ``statusOrder`` / ``completedAt``)."""

    status: TaskStatus


class TaskOut(BaseModel):
    """API shape aligned with frontend ``Task`` (ISO datetimes as strings)."""

    model_config = ConfigDict(extra="allow")

    id: str
    text: str
    description: str | None = None
    status: TaskStatus
    statusOrder: int
    priority: TaskPriority | None = None
    dueDate: str | None = None
    tags: list[dict[str, Any]] | None = None
    subTasks: list[dict[str, Any]] | None = None
    createdAt: str
    completedAt: str | None = None
    created_by: str
    archived: bool | None = None
    timeEstimate: int | None = None
    timeLogged: int | None = None
    isTimerRunning: bool | None = None
    timerStartedAt: str | None = None
    projectId: str | None = None
    assigneeUid: str | None = None


class TaskListResponse(BaseModel):
    items: list[TaskOut]
    page: int
    page_size: int
    total: int
    total_pages: int


class TaskStatsOut(BaseModel):
    """Maps to ``allTaskStats`` + total count used for pagination."""

    total: int
    completed: int
    ongoing: int
    notStarted: int


class TaskImportRequest(BaseModel):
    """Maps to ``importTasks`` batch insert."""

    tasks: list[dict[str, Any]]


class ProjectBase(BaseModel):
    name: str = Field(min_length=1)
    color: str = Field(min_length=1)


class ProjectCreate(ProjectBase):
    pass


class ProjectUpdate(BaseModel):
    model_config = ConfigDict(extra="ignore")

    name: str | None = Field(default=None, min_length=1)
    color: str | None = Field(default=None, min_length=1)


class ProjectOut(BaseModel):
    id: str
    name: str
    color: str
    created_by: str
    createdAt: str
