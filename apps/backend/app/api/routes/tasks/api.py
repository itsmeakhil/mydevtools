from fastapi import APIRouter, Depends, Query

from app.api.routes.auth.services import get_current_uid
from app.api.routes.tasks import services as task_svc
from app.api.routes.tasks.schema import (
    ProjectCreate,
    ProjectOut,
    ProjectUpdate,
    TaskCreate,
    TaskImportRequest,
    TaskListResponse,
    TaskOut,
    TaskStatsOut,
    TaskStatusUpdate,
    TaskUpdate,
)

tasks_router = APIRouter(tags=["tasks"])
projects_router = APIRouter(tags=["projects"])


@tasks_router.get("/stats", response_model=TaskStatsOut, summary="Task counts (dashboard stats)")
async def task_stats(uid: str = Depends(get_current_uid)) -> TaskStatsOut:
    return await task_svc.get_task_stats(uid=uid)


@tasks_router.get("/export", response_model=list[TaskOut], summary="All tasks for export (filtered)")
async def export_tasks(
    uid: str = Depends(get_current_uid),
    status: str = Query(default="all"),
    project_id: str = Query(default="all", alias="projectId"),
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=2000, ge=1, le=10000),
) -> list[TaskOut]:
    return await task_svc.export_tasks(
        uid=uid,
        status_filter=status,
        project_filter=project_id,
        skip=skip,
        limit=limit,
    )


@tasks_router.post("/import", summary="Batch import tasks")
async def import_tasks(
    body: TaskImportRequest,
    uid: str = Depends(get_current_uid),
) -> dict[str, int]:
    return await task_svc.import_tasks(uid, body)


@tasks_router.get("", response_model=TaskListResponse, summary="Paginated task list")
async def list_tasks(
    uid: str = Depends(get_current_uid),
    status: str = Query(default="all"),
    project_id: str = Query(default="all", alias="projectId"),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=10, ge=1, le=100, alias="pageSize"),
) -> TaskListResponse:
    return await task_svc.list_tasks(
        uid=uid,
        status_filter=status,
        project_filter=project_id,
        page=page,
        page_size=page_size,
    )


@tasks_router.get("/{task_id}", response_model=TaskOut, summary="Get one task")
async def get_task(
    task_id: str,
    uid: str = Depends(get_current_uid),
) -> TaskOut:
    return await task_svc.get_task(uid=uid, task_id=task_id)


@tasks_router.post("", response_model=TaskOut, summary="Create task")
async def create_task(
    body: TaskCreate,
    uid: str = Depends(get_current_uid),
) -> TaskOut:
    return await task_svc.create_task(uid, body)


@tasks_router.patch("/{task_id}", response_model=TaskOut, summary="Partial update (Firestore updateDoc)")
async def patch_task(
    task_id: str,
    body: TaskUpdate,
    uid: str = Depends(get_current_uid),
) -> TaskOut:
    return await task_svc.update_task(uid, task_id, body)


@tasks_router.patch("/{task_id}/status", response_model=TaskOut, summary="Update status + statusOrder")
async def patch_task_status(
    task_id: str,
    body: TaskStatusUpdate,
    uid: str = Depends(get_current_uid),
) -> TaskOut:
    return await task_svc.update_task_status(uid, task_id, body)


@tasks_router.delete("/{task_id}", status_code=204, summary="Delete task")
async def remove_task(
    task_id: str,
    uid: str = Depends(get_current_uid),
) -> None:
    await task_svc.delete_task(uid, task_id)


@projects_router.get("", response_model=list[ProjectOut], summary="List projects")
async def list_projects(uid: str = Depends(get_current_uid)) -> list[ProjectOut]:
    return await task_svc.list_projects(uid=uid)


@projects_router.post("", response_model=ProjectOut, summary="Create project")
async def create_project(
    body: ProjectCreate,
    uid: str = Depends(get_current_uid),
) -> ProjectOut:
    return await task_svc.create_project(uid, body)


@projects_router.patch("/{project_id}", response_model=ProjectOut, summary="Update project")
async def patch_project(
    project_id: str,
    body: ProjectUpdate,
    uid: str = Depends(get_current_uid),
) -> ProjectOut:
    return await task_svc.update_project(uid, project_id, body)


@projects_router.delete("/{project_id}", status_code=204, summary="Delete project")
async def remove_project(
    project_id: str,
    uid: str = Depends(get_current_uid),
) -> None:
    await task_svc.delete_project(uid, project_id)


router = APIRouter()
router.include_router(tasks_router, prefix="/tasks")
router.include_router(projects_router, prefix="/projects")
