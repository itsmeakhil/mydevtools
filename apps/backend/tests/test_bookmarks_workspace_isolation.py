import pytest
from app.api.routes.bookmarks import services as bm_svc
from app.api.routes.bookmarks.schema import BookmarkCreate, BookmarkFolderCreate
from app.api.routes.workspaces.middleware import WorkspaceContext


def _ctx(uid: str, ws_id: str) -> WorkspaceContext:
    return WorkspaceContext(
        uid=uid, workspace_id=ws_id, ws_role="admin",
        is_personal=True, owner_uid=uid,
    )


@pytest.mark.asyncio
async def test_bookmarks_are_isolated_across_personal_workspaces(
    clean_db, personal_ws_for,
):
    ws_u1 = await personal_ws_for("u1")
    ws_u2 = await personal_ws_for("u2")

    ctx_u1 = _ctx("u1", ws_u1)
    ctx_u2 = _ctx("u2", ws_u2)

    await bm_svc.create_bookmark(ctx_u1, BookmarkCreate(title="u1 bookmark", url="https://u1.example"))

    bookmarks_u1 = await bm_svc.list_bookmarks(ctx=ctx_u1)
    bookmarks_u2 = await bm_svc.list_bookmarks(ctx=ctx_u2)

    assert len(bookmarks_u1) == 1
    assert len(bookmarks_u2) == 0


@pytest.mark.asyncio
async def test_forged_workspace_id_cannot_cross_bookmark_data(
    clean_db, personal_ws_for,
):
    ws_u1 = await personal_ws_for("u1")
    await personal_ws_for("u2")

    ctx_u1 = _ctx("u1", ws_u1)
    await bm_svc.create_bookmark(ctx_u1, BookmarkCreate(title="u1 secret", url="https://u1.example"))

    forged_ctx = _ctx("u2", ws_u1)  # u2 forges u1's workspace_id
    bookmarks = await bm_svc.list_bookmarks(ctx=forged_ctx)
    assert bookmarks == []  # owner_uid filter saves us


@pytest.mark.asyncio
async def test_folders_are_isolated_across_personal_workspaces(
    clean_db, personal_ws_for,
):
    ws_u1 = await personal_ws_for("u1")
    ws_u2 = await personal_ws_for("u2")

    ctx_u1 = _ctx("u1", ws_u1)
    ctx_u2 = _ctx("u2", ws_u2)

    await bm_svc.create_folder(ctx_u1, BookmarkFolderCreate(name="u1 folder"))

    folders_u1 = await bm_svc.list_folders(ctx=ctx_u1)
    folders_u2 = await bm_svc.list_folders(ctx=ctx_u2)

    assert len(folders_u1) == 1
    assert len(folders_u2) == 0
