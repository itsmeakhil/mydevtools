
from fastapi import APIRouter, Depends, Query

from app.api.routes.auth.services import get_current_uid
from app.api.routes.bookmarks import services as bm_svc
from app.api.routes.bookmarks.schema import (
    BookmarkCreate,
    BookmarkFolderCreate,
    BookmarkFolderExpanded,
    BookmarkFolderOut,
    BookmarkFolderUpdate,
    BookmarkImportBody,
    BookmarkMove,
    BookmarkOut,
    BookmarkSnapshotOut,
    BookmarkUpdate,
)

bookmarks_router = APIRouter(tags=["bookmarks"])
folders_router = APIRouter(tags=["bookmark-folders"])


@bookmarks_router.get(
    "/snapshot",
    response_model=BookmarkSnapshotOut,
    summary="Full export (bookmarks + folders), same shape as client JSON export",
)
async def get_snapshot(uid: str = Depends(get_current_uid)) -> BookmarkSnapshotOut:
    return await bm_svc.snapshot(uid)


@bookmarks_router.post("/import", summary="Upsert folders + bookmarks (HTML/JSON import parity)")
async def import_bookmarks(
    body: BookmarkImportBody,
    uid: str = Depends(get_current_uid),
) -> dict[str, int]:
    return await bm_svc.import_bookmarks(uid, body)


@bookmarks_router.post("/clear-all", summary="Delete all bookmarks and folders for user (clearAll)")
async def clear_all(uid: str = Depends(get_current_uid)) -> dict[str, int]:
    return await bm_svc.clear_all_bookmarks(uid)


@bookmarks_router.get("", response_model=list[BookmarkOut], summary="List bookmarks")
async def list_bookmarks(
    uid: str = Depends(get_current_uid),
    folder_id: str | None = Query(
        default=None,
        alias="folderId",
    ),
    skip: int = Query(default=0, ge=0),
    limit: int | None = Query(default=None, ge=1, le=500),
) -> list[BookmarkOut]:
    return await bm_svc.list_bookmarks(uid=uid, folder_id=folder_id, skip=skip, limit=limit)


@bookmarks_router.post("", response_model=BookmarkOut, summary="Create bookmark (addBookmark)")
async def create_bookmark(
    body: BookmarkCreate,
    uid: str = Depends(get_current_uid),
) -> BookmarkOut:
    return await bm_svc.create_bookmark(uid, body)


@bookmarks_router.get("/{bookmark_id}", response_model=BookmarkOut, summary="Get one bookmark")
async def get_bookmark(
    bookmark_id: str,
    uid: str = Depends(get_current_uid),
) -> BookmarkOut:
    return await bm_svc.get_bookmark(uid=uid, bookmark_id=bookmark_id)


@bookmarks_router.patch("/{bookmark_id}", response_model=BookmarkOut, summary="Update bookmark (updateBookmark)")
async def patch_bookmark(
    bookmark_id: str,
    body: BookmarkUpdate,
    uid: str = Depends(get_current_uid),
) -> BookmarkOut:
    return await bm_svc.update_bookmark(uid, bookmark_id, body)


@bookmarks_router.patch(
    "/{bookmark_id}/move",
    response_model=BookmarkOut,
    summary="Move bookmark to folder (moveBookmark)",
)
async def move_bookmark(
    bookmark_id: str,
    body: BookmarkMove,
    uid: str = Depends(get_current_uid),
) -> BookmarkOut:
    return await bm_svc.move_bookmark(uid, bookmark_id, body)


@bookmarks_router.delete("/{bookmark_id}", status_code=204, summary="Delete bookmark (deleteBookmark)")
async def remove_bookmark(
    bookmark_id: str,
    uid: str = Depends(get_current_uid),
) -> None:
    await bm_svc.delete_bookmark(uid, bookmark_id)


@folders_router.get("", response_model=list[BookmarkFolderOut], summary="List folders (tree source)")
async def list_folders(
    uid: str = Depends(get_current_uid),
    skip: int = Query(default=0, ge=0),
    limit: int | None = Query(default=None, ge=1, le=500),
) -> list[BookmarkFolderOut]:
    return await bm_svc.list_folders(uid=uid, skip=skip, limit=limit)


@folders_router.post("", response_model=BookmarkFolderOut, summary="Create folder (addFolder)")
async def create_folder(
    body: BookmarkFolderCreate,
    uid: str = Depends(get_current_uid),
) -> BookmarkFolderOut:
    return await bm_svc.create_folder(uid, body)


@folders_router.get("/{folder_id}", response_model=BookmarkFolderOut, summary="Get one folder")
async def get_folder(
    folder_id: str,
    uid: str = Depends(get_current_uid),
) -> BookmarkFolderOut:
    return await bm_svc.get_folder(uid, folder_id)


@folders_router.patch("/{folder_id}", response_model=BookmarkFolderOut, summary="Update folder (updateFolder)")
async def patch_folder(
    folder_id: str,
    body: BookmarkFolderUpdate,
    uid: str = Depends(get_current_uid),
) -> BookmarkFolderOut:
    return await bm_svc.update_folder(uid, folder_id, body)


@folders_router.patch(
    "/{folder_id}/expanded",
    response_model=BookmarkFolderOut,
    summary="Toggle tree expanded (toggleFolderExpanded)",
)
async def patch_folder_expanded(
    folder_id: str,
    body: BookmarkFolderExpanded,
    uid: str = Depends(get_current_uid),
) -> BookmarkFolderOut:
    return await bm_svc.set_folder_expanded(uid, folder_id, body.isExpanded)


@folders_router.delete(
    "/{folder_id}",
    status_code=204,
    summary="Delete folder and descendants; uncategorize bookmarks (deleteFolder)",
)
async def remove_folder(
    folder_id: str,
    uid: str = Depends(get_current_uid),
) -> None:
    await bm_svc.delete_folder(uid, folder_id)


router = APIRouter()
router.include_router(bookmarks_router, prefix="/bookmarks")
router.include_router(folders_router, prefix="/bookmark-folders")
