import pytest
from app.api.routes.tasks import services as task_svc
from app.api.routes.tasks.schema import ProjectCreate, TaskCreate, TaskStatusUpdate, TaskUpdate
from app.api.routes.workspaces.middleware import WorkspaceContext


def _ctx(uid: str, ws_id: str, org_id: str) -> WorkspaceContext:
    return WorkspaceContext(
        uid=uid, org_id=org_id, workspace_id=ws_id, ws_role="admin",
        is_personal=True, owner_uid=uid,
    )


def _shared_ctx(uid: str, ws_id: str, org_id: str) -> WorkspaceContext:
    """A shared (non-personal) workspace context — no owner_uid lock, so any
    member with a writer role can mutate any task in the workspace."""
    return WorkspaceContext(
        uid=uid, org_id=org_id, workspace_id=ws_id, ws_role="admin",
        is_personal=False, owner_uid=None,
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


@pytest.mark.asyncio
async def test_shared_workspace_member_can_edit_anothers_task(
    clean_db, system_org_id,
):
    """Collaboration unlock: in a shared workspace, member B can edit / move /
    delete a task member A created (was blocked by the old created_by filter)."""
    org_id = system_org_id
    ws = "ws-shared-1"
    ctx_a = _shared_ctx("u1", ws, org_id)
    ctx_b = _shared_ctx("u2", ws, org_id)

    created = await task_svc.create_task(ctx_a, TaskCreate(text="shared task"))

    # B sees it
    listed = await task_svc.list_tasks(ctx=ctx_b)
    assert [t.id for t in listed.items] == [created.id]

    # B assigns it to A and renames it
    updated = await task_svc.update_task(
        ctx_b, created.id, TaskUpdate(text="renamed by B", assigneeUid="u1")
    )
    assert updated.text == "renamed by B"
    assert updated.assigneeUid == "u1"

    # B moves it across the board
    moved = await task_svc.update_task_status(
        ctx_b, created.id, TaskStatusUpdate(status="completed")
    )
    assert moved.status == "completed"

    # B deletes it
    await task_svc.delete_task(ctx_b, created.id)
    assert (await task_svc.list_tasks(ctx=ctx_a)).items == []


@pytest.mark.asyncio
async def test_shared_workspace_isolated_from_other_shared_workspace(
    clean_db, system_org_id,
):
    """A shared workspace's tasks never leak into a different workspace."""
    org_id = system_org_id
    ctx_a = _shared_ctx("u1", "ws-shared-A", org_id)
    ctx_other = _shared_ctx("u1", "ws-shared-B", org_id)

    await task_svc.create_task(ctx_a, TaskCreate(text="A-only"))
    assert (await task_svc.list_tasks(ctx=ctx_other)).items == []


@pytest.mark.asyncio
async def test_assignee_filter(clean_db, system_org_id):
    """list_tasks assignee filter supports me / unassigned / specific uid."""
    org_id = system_org_id
    ctx = _shared_ctx("u1", "ws-assignee", org_id)

    await task_svc.create_task(ctx, TaskCreate(text="assigned to u2", assigneeUid="u2"))
    await task_svc.create_task(ctx, TaskCreate(text="unassigned"))
    await task_svc.create_task(ctx, TaskCreate(text="mine", assigneeUid="u1"))

    all_tasks = await task_svc.list_tasks(ctx=ctx)
    assert all_tasks.total == 3

    mine = await task_svc.list_tasks(ctx=ctx, assignee_filter="me")
    assert [t.text for t in mine.items] == ["mine"]

    u2 = await task_svc.list_tasks(ctx=ctx, assignee_filter="u2")
    assert [t.text for t in u2.items] == ["assigned to u2"]

    unassigned = await task_svc.list_tasks(ctx=ctx, assignee_filter="unassigned")
    assert [t.text for t in unassigned.items] == ["unassigned"]
