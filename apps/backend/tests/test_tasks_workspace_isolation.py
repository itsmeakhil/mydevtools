import pytest
from app.api.routes.tasks import services as task_svc
from app.api.routes.tasks.schema import ProjectCreate, TaskCreate
from app.api.routes.workspaces.middleware import WorkspaceContext


def _ctx(uid: str, ws_id: str, org_id: str) -> WorkspaceContext:
    return WorkspaceContext(
        uid=uid, org_id=org_id, workspace_id=ws_id, ws_role="admin",
        is_personal=True, owner_uid=uid,
    )


@pytest.mark.asyncio
async def test_tasks_are_isolated_across_personal_workspaces(
    clean_db, system_org_id, personal_ws_for,
):
    org_id = system_org_id
    ws_u1 = await personal_ws_for("u1")
    ws_u2 = await personal_ws_for("u2")

    ctx_u1 = _ctx("u1", ws_u1, org_id)
    ctx_u2 = _ctx("u2", ws_u2, org_id)

    await task_svc.create_task(ctx_u1, TaskCreate(text="u1 task"))

    result_u1 = await task_svc.list_tasks(ctx=ctx_u1)
    result_u2 = await task_svc.list_tasks(ctx=ctx_u2)

    assert len(result_u1.items) == 1
    assert len(result_u2.items) == 0


@pytest.mark.asyncio
async def test_projects_are_isolated_across_personal_workspaces(
    clean_db, system_org_id, personal_ws_for,
):
    org_id = system_org_id
    ws_u1 = await personal_ws_for("u1")
    ws_u2 = await personal_ws_for("u2")

    ctx_u1 = _ctx("u1", ws_u1, org_id)
    ctx_u2 = _ctx("u2", ws_u2, org_id)

    await task_svc.create_project(ctx_u1, ProjectCreate(name="u1 project", color="#ff0000"))

    projects_u1 = await task_svc.list_projects(ctx=ctx_u1)
    projects_u2 = await task_svc.list_projects(ctx=ctx_u2)

    assert len(projects_u1) == 1
    assert len(projects_u2) == 0


@pytest.mark.asyncio
async def test_forged_workspace_id_cannot_cross_task_data(
    clean_db, system_org_id, personal_ws_for,
):
    org_id = system_org_id
    ws_u1 = await personal_ws_for("u1")
    await personal_ws_for("u2")

    ctx_u1 = _ctx("u1", ws_u1, org_id)
    await task_svc.create_task(ctx_u1, TaskCreate(text="u1 secret task"))

    # u2 forges u1's workspace_id but has different uid → owner_uid filter blocks them
    forged_ctx = _ctx("u2", ws_u1, org_id)
    result = await task_svc.list_tasks(ctx=forged_ctx)
    assert result.items == []
