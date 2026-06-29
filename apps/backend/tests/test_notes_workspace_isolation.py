import pytest
from app.api.routes.notes import services as note_svc
from app.api.routes.notes.schema import NoteCreate
from app.api.routes.workspaces.middleware import WorkspaceContext


def _ctx(uid: str, ws_id: str, org_id: str) -> WorkspaceContext:
    return WorkspaceContext(
        uid=uid, org_id=org_id, workspace_id=ws_id, ws_role="admin",
        is_personal=True, owner_uid=uid,
    )


@pytest.mark.asyncio
async def test_notes_are_isolated_across_personal_workspaces(
    clean_db, system_org_id, personal_ws_for,
):
    org_id = system_org_id
    ws_u1 = await personal_ws_for("u1")
    ws_u2 = await personal_ws_for("u2")

    ctx_u1 = _ctx("u1", ws_u1, org_id)
    ctx_u2 = _ctx("u2", ws_u2, org_id)

    await note_svc.create_note(ctx_u1, NoteCreate(title="u1 note"))

    notes_u1 = await note_svc.list_notes(ctx=ctx_u1)
    notes_u2 = await note_svc.list_notes(ctx=ctx_u2)

    assert len(notes_u1) == 1
    assert len(notes_u2) == 0


@pytest.mark.asyncio
async def test_forged_workspace_id_cannot_cross_note_data(
    clean_db, system_org_id, personal_ws_for,
):
    org_id = system_org_id
    ws_u1 = await personal_ws_for("u1")
    await personal_ws_for("u2")

    ctx_u1 = _ctx("u1", ws_u1, org_id)
    await note_svc.create_note(ctx_u1, NoteCreate(title="u1 secret note"))

    # u2 forges u1's workspace_id but has different uid -> owner_uid filter blocks them
    forged_ctx = _ctx("u2", ws_u1, org_id)
    notes = await note_svc.list_notes(ctx=forged_ctx)
    assert notes == []
