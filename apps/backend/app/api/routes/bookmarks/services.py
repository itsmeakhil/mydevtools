from typing import Any

from fastapi import HTTPException, status
from pymongo import ReplaceOne
from pymongo.errors import PyMongoError

from app.api.routes.bookmarks.schema import (
    BookmarkCreate,
    BookmarkFolderCreate,
    BookmarkFolderOut,
    BookmarkFolderUpdate,
    BookmarkImportBody,
    BookmarkMove,
    BookmarkOut,
    BookmarkSnapshotOut,
    BookmarkUpdate,
)
from app.api.routes.workspaces.middleware import (
    WorkspaceContext,
    apply_legacy_or_filter,
    apply_workspace_filter,
)
from app.core import audit
from app.database import db_manager
from app.utils.collection_name import BOOKMARK_FOLDERS as FOLDERS
from app.utils.collection_name import BOOKMARKS
from app.utils.crud import safe_insert, safe_update_one
from app.utils.utils import create_timestamp, new_id


def _bookmark_doc_to_out(doc: dict[str, Any]) -> BookmarkOut:
    bid = doc.get("_id")
    return BookmarkOut(
        id=str(bid) if bid is not None else "",
        title=doc.get("title", ""),
        url=doc.get("url", ""),
        description=doc.get("description"),
        favicon=doc.get("favicon"),
        tags=list(doc.get("tags") or []),
        folderId=doc.get("folderId"),
        createdAt=int(doc.get("createdAt", 0)),
        updatedAt=int(doc.get("updatedAt", 0)),
    )


def _folder_doc_to_out(doc: dict[str, Any]) -> BookmarkFolderOut:
    fid = doc.get("_id")
    return BookmarkFolderOut(
        id=str(fid) if fid is not None else "",
        name=doc.get("name", ""),
        parentId=doc.get("parentId"),
        color=doc.get("color"),
        icon=doc.get("icon"),
        isExpanded=doc.get("isExpanded"),
        createdAt=int(doc.get("createdAt", 0)),
    )


# ponytail: cache removed during workspace refactor; re-add with (workspace_id, uid) key if hot
async def list_bookmarks(
    *,
    ctx: WorkspaceContext,
    folder_id: str | None = None,
    skip: int = 0,
    limit: int | None = None,
) -> list[BookmarkOut]:
    base: dict[str, Any] = {}
    if folder_id == "uncategorized":
        base["$or"] = [{"folderId": None}, {"folderId": {"$exists": False}}]
    elif folder_id is not None and folder_id != "":
        base["folderId"] = folder_id

    q = apply_legacy_or_filter(ctx, base, user_field="created_by")

    docs = await db_manager.find(
        BOOKMARKS, q, sort=[("updatedAt", -1), ("createdAt", -1)], skip=skip, limit=limit or 0
    )
    return [_bookmark_doc_to_out(d) for d in docs]


# ponytail: cache removed during workspace refactor; re-add with (workspace_id, uid) key if hot
async def get_bookmark(*, ctx: WorkspaceContext, bookmark_id: str) -> BookmarkOut:
    flt = apply_workspace_filter(ctx, {"_id": bookmark_id, "created_by": ctx.uid})
    doc = await db_manager.find_one(BOOKMARKS, flt)
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Bookmark not found.")
    return _bookmark_doc_to_out(doc)


async def create_bookmark(ctx: WorkspaceContext, body: BookmarkCreate) -> BookmarkOut:
    bid = body.id or new_id()
    ts = create_timestamp()
    doc: dict[str, Any] = {
        "_id": bid,
        "created_by": ctx.uid,
        "org_id": ctx.org_id,
        "workspace_id": ctx.workspace_id,
        "owner_uid": ctx.uid,
        "title": body.title,
        "url": body.url,
        "description": body.description,
        "favicon": body.favicon,
        "tags": body.tags,
        "folderId": body.folderId,
        "createdAt": ts,
        "updatedAt": ts,
    }
    await safe_insert(BOOKMARKS, doc, name="Bookmark")
    audit.set_action("bookmark.create")
    audit.set_entity("bookmark", bid)
    audit.set_summary(f"Created bookmark '{body.title}'")
    audit.set_changes(audit.diff(None, doc))
    return _bookmark_doc_to_out(doc)


async def update_bookmark(ctx: WorkspaceContext, bookmark_id: str, body: BookmarkUpdate) -> BookmarkOut:
    patch = body.model_dump(exclude_unset=True)
    if not patch:
        return await get_bookmark(ctx=ctx, bookmark_id=bookmark_id)
    flt = apply_workspace_filter(ctx, {"_id": bookmark_id, "created_by": ctx.uid})
    before = await db_manager.find_one(BOOKMARKS, flt)
    patch["updatedAt"] = create_timestamp()
    result = await safe_update_one(
        BOOKMARKS, flt, patch, name="Bookmark"
    )
    audit.set_action("bookmark.update")
    audit.set_entity("bookmark", bookmark_id)
    audit.set_summary(f"Updated bookmark '{result.get('title', '')}'")
    audit.set_changes(audit.diff(before, result))
    return _bookmark_doc_to_out(result)


async def move_bookmark(ctx: WorkspaceContext, bookmark_id: str, body: BookmarkMove) -> BookmarkOut:
    return await update_bookmark(ctx, bookmark_id, BookmarkUpdate(folderId=body.folderId))


async def delete_bookmark(ctx: WorkspaceContext, bookmark_id: str) -> None:
    flt = apply_workspace_filter(ctx, {"_id": bookmark_id, "created_by": ctx.uid})
    before = await db_manager.find_one(BOOKMARKS, flt)
    result = await db_manager.delete_one(BOOKMARKS, flt)
    if result.deleted_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Bookmark not found.")
    audit.set_action("bookmark.delete")
    audit.set_entity("bookmark", bookmark_id)
    title = (before or {}).get("title", "")
    audit.set_summary(f"Deleted bookmark '{title}'")


async def import_bookmarks(ctx: WorkspaceContext, body: BookmarkImportBody) -> dict[str, int]:
    folder_ops: list[ReplaceOne] = []
    bookmark_ops: list[ReplaceOne] = []
    try:
        for folder in body.folders:
            fid = str(folder.id or new_id())
            doc = {
                "_id": fid,
                "created_by": ctx.uid,
                "org_id": ctx.org_id,
                "workspace_id": ctx.workspace_id,
                "owner_uid": ctx.uid,
                "name": folder.name,
                "parentId": folder.parentId,
                "color": folder.color,
                "icon": folder.icon,
                "isExpanded": folder.isExpanded or False,
                "createdAt": create_timestamp(),
            }
            flt = apply_legacy_or_filter(ctx, {"_id": fid}, user_field="created_by")
            folder_ops.append(ReplaceOne(flt, doc, upsert=True))

        for bookmark in body.bookmarks:
            bid = str(bookmark.id or new_id())
            ts = create_timestamp()
            doc = {
                "_id": bid,
                "created_by": ctx.uid,
                "org_id": ctx.org_id,
                "workspace_id": ctx.workspace_id,
                "owner_uid": ctx.uid,
                "title": bookmark.title,
                "url": bookmark.url,
                "description": bookmark.description,
                "favicon": bookmark.favicon,
                "tags": list(bookmark.tags),
                "folderId": bookmark.folderId,
                "createdAt": ts,
                "updatedAt": ts,
            }
            flt = apply_legacy_or_filter(ctx, {"_id": bid}, user_field="created_by")
            bookmark_ops.append(ReplaceOne(flt, doc, upsert=True))

        if folder_ops:
            await db_manager.bulk_write(FOLDERS, folder_ops, ordered=False)
        if bookmark_ops:
            await db_manager.bulk_write(BOOKMARKS, bookmark_ops, ordered=False)
    except PyMongoError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to import bookmarks."
        ) from exc
    return {"foldersUpserted": len(folder_ops), "bookmarksUpserted": len(bookmark_ops)}


async def clear_all_bookmarks(ctx: WorkspaceContext) -> dict[str, int]:
    flt = apply_workspace_filter(ctx, {"created_by": ctx.uid})
    br = await db_manager.delete_many(BOOKMARKS, flt)
    fr = await db_manager.delete_many(FOLDERS, flt)
    return {"bookmarksDeleted": br.deleted_count, "foldersDeleted": fr.deleted_count}


async def snapshot(ctx: WorkspaceContext) -> BookmarkSnapshotOut:
    return BookmarkSnapshotOut(
        bookmarks=await list_bookmarks(ctx=ctx, folder_id=None),
        folders=await list_folders(ctx=ctx),
    )


# ponytail: cache removed during workspace refactor; re-add with (workspace_id, uid) key if hot
async def list_folders(*, ctx: WorkspaceContext, skip: int = 0, limit: int | None = None) -> list[BookmarkFolderOut]:
    flt = apply_legacy_or_filter(ctx, {}, user_field="created_by")
    docs = await db_manager.find(
        FOLDERS, flt, sort=[("createdAt", 1)], skip=skip, limit=limit or 0
    )
    return [_folder_doc_to_out(d) for d in docs]


async def get_folder(ctx: WorkspaceContext, folder_id: str) -> BookmarkFolderOut:
    flt = apply_workspace_filter(ctx, {"_id": folder_id, "created_by": ctx.uid})
    doc = await db_manager.find_one(FOLDERS, flt)
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Folder not found.")
    return _folder_doc_to_out(doc)


async def create_folder(ctx: WorkspaceContext, body: BookmarkFolderCreate) -> BookmarkFolderOut:
    fid = body.id or new_id()
    ts = create_timestamp()
    doc: dict[str, Any] = {
        "_id": fid,
        "created_by": ctx.uid,
        "org_id": ctx.org_id,
        "workspace_id": ctx.workspace_id,
        "owner_uid": ctx.uid,
        "name": body.name,
        "parentId": body.parentId,
        "color": body.color,
        "icon": body.icon,
        "isExpanded": body.isExpanded if body.isExpanded is not None else False,
        "createdAt": ts,
    }
    await safe_insert(FOLDERS, doc, name="Folder")
    return _folder_doc_to_out(doc)


async def update_folder(ctx: WorkspaceContext, folder_id: str, body: BookmarkFolderUpdate) -> BookmarkFolderOut:
    patch = body.model_dump(exclude_unset=True)
    if not patch:
        return await get_folder(ctx, folder_id)
    flt = apply_workspace_filter(ctx, {"_id": folder_id, "created_by": ctx.uid})
    result = await safe_update_one(
        FOLDERS, flt, patch, name="Folder"
    )
    return _folder_doc_to_out(result)


async def set_folder_expanded(ctx: WorkspaceContext, folder_id: str, is_expanded: bool) -> BookmarkFolderOut:
    return await update_folder(ctx, folder_id, BookmarkFolderUpdate(isExpanded=is_expanded))


async def delete_folder(ctx: WorkspaceContext, folder_id: str) -> None:
    pipeline = [
        {"$match": apply_workspace_filter(ctx, {"_id": folder_id, "created_by": ctx.uid})},
        {
            "$graphLookup": {
                "from": FOLDERS,
                "startWith": "$_id",
                "connectFromField": "_id",
                "connectToField": "parentId",
                "as": "descendants",
                "restrictSearchWithMatch": apply_workspace_filter(ctx, {"created_by": ctx.uid}),
            }
        },
        {"$project": {"descendants._id": 1}},
    ]
    results = await db_manager.aggregate(FOLDERS, pipeline)
    if not results:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Folder not found.")
    to_remove = [folder_id, *[str(d["_id"]) for d in results[0].get("descendants", [])]]
    try:
        flt_folders = apply_workspace_filter(ctx, {"_id": {"$in": to_remove}, "created_by": ctx.uid})
        flt_bookmarks = apply_workspace_filter(ctx, {"created_by": ctx.uid, "folderId": {"$in": to_remove}})
        await db_manager.delete_many(FOLDERS, flt_folders)
        await db_manager.update_many(
            BOOKMARKS,
            flt_bookmarks,
            {"$set": {"folderId": None, "updatedAt": create_timestamp()}},
        )
    except PyMongoError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to delete folder."
        ) from exc
