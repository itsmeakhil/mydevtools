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

from typing import Any, Literal, Optional

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
    description: Optional[str] = None
    status: TaskStatus = "not-started"
    statusOrder: int = 2
    priority: Optional[TaskPriority] = None
    dueDate: Optional[str] = None
    tags: Optional[list[TaskTag]] = None
    subTasks: Optional[list[SubTask]] = None
    archived: Optional[bool] = None
    timeEstimate: Optional[int] = None
    timeLogged: Optional[int] = None
    isTimerRunning: Optional[bool] = None
    timerStartedAt: Optional[str] = None
    projectId: Optional[str] = None


class TaskCreate(BaseModel):
    """Maps to ``addTask``: title + optional project."""

    text: str = Field(min_length=1)
    projectId: Optional[str] = None


class TaskUpdate(BaseModel):
    """
    Partial update; maps to ``updateTask`` (id / created_by / createdAt must not be sent).
    Server sets ``completedAt`` when status becomes ``completed`` if omitted.
    """

    model_config = ConfigDict(extra="ignore")

    text: Optional[str] = None
    description: Optional[str] = None
    status: Optional[TaskStatus] = None
    statusOrder: Optional[int] = None
    priority: Optional[TaskPriority] = None
    dueDate: Optional[str] = None
    tags: Optional[list[TaskTag]] = None
    subTasks: Optional[list[SubTask]] = None
    archived: Optional[bool] = None
    timeEstimate: Optional[int] = None
    timeLogged: Optional[int] = None
    isTimerRunning: Optional[bool] = None
    timerStartedAt: Optional[str] = None
    projectId: Optional[str] = None


class TaskStatusUpdate(BaseModel):
    """Maps to ``updateTaskStatus`` (status + derived ``statusOrder`` / ``completedAt``)."""

    status: TaskStatus


class TaskOut(BaseModel):
    """API shape aligned with frontend ``Task`` (ISO datetimes as strings)."""

    model_config = ConfigDict(extra="allow")

    id: str
    text: str
    description: Optional[str] = None
    status: TaskStatus
    statusOrder: int
    priority: Optional[TaskPriority] = None
    dueDate: Optional[str] = None
    tags: Optional[list[dict[str, Any]]] = None
    subTasks: Optional[list[dict[str, Any]]] = None
    createdAt: str
    completedAt: Optional[str] = None
    created_by: str
    archived: Optional[bool] = None
    timeEstimate: Optional[int] = None
    timeLogged: Optional[int] = None
    isTimerRunning: Optional[bool] = None
    timerStartedAt: Optional[str] = None
    projectId: Optional[str] = None


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

    name: Optional[str] = Field(default=None, min_length=1)
    color: Optional[str] = Field(default=None, min_length=1)


class ProjectOut(BaseModel):
    id: str
    name: str
    color: str
    created_by: str
    createdAt: str
