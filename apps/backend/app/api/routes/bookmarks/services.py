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
from app.core import audit
from app.core.cache import bump_version, cached
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


@cached(ns="bookmarks", ttl=120, scope="user")
async def list_bookmarks(
    *,
    uid: str,
    folder_id: str | None = None,
    skip: int = 0,
    limit: int | None = None,
) -> list[BookmarkOut]:
    q: dict[str, Any] = {"created_by": uid}
    if folder_id == "uncategorized":
        q["$or"] = [{"folderId": None}, {"folderId": {"$exists": False}}]
    elif folder_id is not None and folder_id != "":
        q["folderId"] = folder_id

    docs = await db_manager.find(
        BOOKMARKS, q, sort=[("updatedAt", -1), ("createdAt", -1)], skip=skip, limit=limit or 0
    )
    return [_bookmark_doc_to_out(d) for d in docs]


@cached(ns="bookmarks", ttl=120, scope="user")
async def get_bookmark(*, uid: str, bookmark_id: str) -> BookmarkOut:
    doc = await db_manager.find_one(BOOKMARKS, {"_id": bookmark_id, "created_by": uid})
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Bookmark not found.")
    return _bookmark_doc_to_out(doc)


async def create_bookmark(uid: str, body: BookmarkCreate) -> BookmarkOut:
    bid = body.id or new_id()
    ts = create_timestamp()
    doc: dict[str, Any] = {
        "_id": bid,
        "created_by": uid,
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
    await bump_version(ns="bookmarks", uid=uid)
    return _bookmark_doc_to_out(doc)


async def update_bookmark(uid: str, bookmark_id: str, body: BookmarkUpdate) -> BookmarkOut:
    patch = body.model_dump(exclude_unset=True)
    if not patch:
        return await get_bookmark(uid=uid, bookmark_id=bookmark_id)
    before = await db_manager.find_one(BOOKMARKS, {"_id": bookmark_id, "created_by": uid})
    patch["updatedAt"] = create_timestamp()
    result = await safe_update_one(
        BOOKMARKS, {"_id": bookmark_id, "created_by": uid}, patch, name="Bookmark"
    )
    audit.set_action("bookmark.update")
    audit.set_entity("bookmark", bookmark_id)
    audit.set_summary(f"Updated bookmark '{result.get('title', '')}'")
    audit.set_changes(audit.diff(before, result))
    await bump_version(ns="bookmarks", uid=uid)
    return _bookmark_doc_to_out(result)


async def move_bookmark(uid: str, bookmark_id: str, body: BookmarkMove) -> BookmarkOut:
    return await update_bookmark(uid, bookmark_id, BookmarkUpdate(folderId=body.folderId))


async def delete_bookmark(uid: str, bookmark_id: str) -> None:
    before = await db_manager.find_one(BOOKMARKS, {"_id": bookmark_id, "created_by": uid})
    result = await db_manager.delete_one(BOOKMARKS, {"_id": bookmark_id, "created_by": uid})
    if result.deleted_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Bookmark not found.")
    audit.set_action("bookmark.delete")
    audit.set_entity("bookmark", bookmark_id)
    title = (before or {}).get("title", "")
    audit.set_summary(f"Deleted bookmark '{title}'")
    await bump_version(ns="bookmarks", uid=uid)


async def import_bookmarks(uid: str, body: BookmarkImportBody) -> dict[str, int]:
    folder_ops: list[ReplaceOne] = []
    bookmark_ops: list[ReplaceOne] = []
    try:
        for folder in body.folders:
            fid = str(folder.id or new_id())
            doc = {
                "_id": fid,
                "created_by": uid,
                "name": folder.name,
                "parentId": folder.parentId,
                "color": folder.color,
                "icon": folder.icon,
                "isExpanded": folder.isExpanded or False,
                "createdAt": create_timestamp(),
            }
            folder_ops.append(ReplaceOne({"_id": fid, "created_by": uid}, doc, upsert=True))

        for bookmark in body.bookmarks:
            bid = str(bookmark.id or new_id())
            ts = create_timestamp()
            doc = {
                "_id": bid,
                "created_by": uid,
                "title": bookmark.title,
                "url": bookmark.url,
                "description": bookmark.description,
                "favicon": bookmark.favicon,
                "tags": list(bookmark.tags),
                "folderId": bookmark.folderId,
                "createdAt": ts,
                "updatedAt": ts,
            }
            bookmark_ops.append(ReplaceOne({"_id": bid, "created_by": uid}, doc, upsert=True))

        if folder_ops:
            await db_manager.bulk_write(FOLDERS, folder_ops, ordered=False)
        if bookmark_ops:
            await db_manager.bulk_write(BOOKMARKS, bookmark_ops, ordered=False)
    except PyMongoError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to import bookmarks."
        ) from exc
    await bump_version(ns="bookmarks", uid=uid)
    return {"foldersUpserted": len(folder_ops), "bookmarksUpserted": len(bookmark_ops)}


async def clear_all_bookmarks(uid: str) -> dict[str, int]:
    br = await db_manager.delete_many(BOOKMARKS, {"created_by": uid})
    fr = await db_manager.delete_many(FOLDERS, {"created_by": uid})
    await bump_version(ns="bookmarks", uid=uid)
    return {"bookmarksDeleted": br.deleted_count, "foldersDeleted": fr.deleted_count}


async def snapshot(uid: str) -> BookmarkSnapshotOut:
    return BookmarkSnapshotOut(
        bookmarks=await list_bookmarks(uid=uid, folder_id=None),
        folders=await list_folders(uid=uid),
    )


@cached(ns="bookmarks", ttl=120, scope="user")
async def list_folders(*, uid: str, skip: int = 0, limit: int | None = None) -> list[BookmarkFolderOut]:
    docs = await db_manager.find(
        FOLDERS, {"created_by": uid}, sort=[("createdAt", 1)], skip=skip, limit=limit or 0
    )
    return [_folder_doc_to_out(d) for d in docs]


async def get_folder(uid: str, folder_id: str) -> BookmarkFolderOut:
    doc = await db_manager.find_one(FOLDERS, {"_id": folder_id, "created_by": uid})
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Folder not found.")
    return _folder_doc_to_out(doc)


async def create_folder(uid: str, body: BookmarkFolderCreate) -> BookmarkFolderOut:
    fid = body.id or new_id()
    ts = create_timestamp()
    doc: dict[str, Any] = {
        "_id": fid,
        "created_by": uid,
        "name": body.name,
        "parentId": body.parentId,
        "color": body.color,
        "icon": body.icon,
        "isExpanded": body.isExpanded if body.isExpanded is not None else False,
        "createdAt": ts,
    }
    await safe_insert(FOLDERS, doc, name="Folder")
    await bump_version(ns="bookmarks", uid=uid)
    return _folder_doc_to_out(doc)


async def update_folder(uid: str, folder_id: str, body: BookmarkFolderUpdate) -> BookmarkFolderOut:
    patch = body.model_dump(exclude_unset=True)
    if not patch:
        return await get_folder(uid, folder_id)
    result = await safe_update_one(
        FOLDERS, {"_id": folder_id, "created_by": uid}, patch, name="Folder"
    )
    await bump_version(ns="bookmarks", uid=uid)
    return _folder_doc_to_out(result)


async def set_folder_expanded(uid: str, folder_id: str, is_expanded: bool) -> BookmarkFolderOut:
    return await update_folder(uid, folder_id, BookmarkFolderUpdate(isExpanded=is_expanded))


async def delete_folder(uid: str, folder_id: str) -> None:
    pipeline = [
        {"$match": {"_id": folder_id, "created_by": uid}},
        {
            "$graphLookup": {
                "from": FOLDERS,
                "startWith": "$_id",
                "connectFromField": "_id",
                "connectToField": "parentId",
                "as": "descendants",
                "restrictSearchWithMatch": {"created_by": uid},
            }
        },
        {"$project": {"descendants._id": 1}},
    ]
    results = await db_manager.aggregate(FOLDERS, pipeline)
    if not results:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Folder not found.")
    to_remove = [folder_id, *[str(d["_id"]) for d in results[0].get("descendants", [])]]
    try:
        await db_manager.delete_many(FOLDERS, {"_id": {"$in": to_remove}, "created_by": uid})
        await db_manager.update_many(
            BOOKMARKS,
            {"created_by": uid, "folderId": {"$in": to_remove}},
            {"$set": {"folderId": None, "updatedAt": create_timestamp()}},
        )
    except PyMongoError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to delete folder."
        ) from exc
    await bump_version(ns="bookmarks", uid=uid)
