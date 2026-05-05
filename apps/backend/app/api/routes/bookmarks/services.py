from typing import Any, Optional

from fastapi import HTTPException, status
from pymongo import ReplaceOne
from pymongo.errors import PyMongoError
from pymongo import ReturnDocument
from app.utils.utils import new_id, create_timestamp, is_duplicate_key_error

from app.utils.collection_name import BOOKMARK_FOLDERS as FOLDERS, BOOKMARKS
from app.database import db_manager
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
        created_by=doc.get("created_by", ""),
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
        created_by=doc.get("created_by", ""),
    )


async def list_bookmarks(
    uid: str,
    *,
    folder_id: Optional[str] = None,
    skip: int = 0,
    limit: Optional[int] = None,
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


async def get_bookmark(uid: str, bookmark_id: str) -> BookmarkOut:
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
    try:
        await db_manager.insert_one(BOOKMARKS, doc)
    except PyMongoError as exc:
        if is_duplicate_key_error(exc):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT, detail="Bookmark id already exists."
            ) from exc
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to create bookmark."
        ) from exc
    return _bookmark_doc_to_out(doc)


async def update_bookmark(uid: str, bookmark_id: str, body: BookmarkUpdate) -> BookmarkOut:
    patch = body.model_dump(exclude_unset=True)
    if not patch:
        return await get_bookmark(uid, bookmark_id)
    patch["updatedAt"] = create_timestamp()
    try:
        result = await db_manager.find_one_and_update(
            BOOKMARKS,
            {"_id": bookmark_id, "created_by": uid},
            {"$set": patch},
            return_document=ReturnDocument.AFTER,
        )
    except PyMongoError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to update bookmark."
        ) from exc
    if not result:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Bookmark not found.")
    return _bookmark_doc_to_out(result)


async def move_bookmark(uid: str, bookmark_id: str, body: BookmarkMove) -> BookmarkOut:
    return await update_bookmark(uid, bookmark_id, BookmarkUpdate(folderId=body.folderId))


async def delete_bookmark(uid: str, bookmark_id: str) -> None:
    result = await db_manager.delete_one(BOOKMARKS, {"_id": bookmark_id, "created_by": uid})
    if result.deleted_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Bookmark not found.")


async def import_bookmarks(uid: str, body: BookmarkImportBody) -> dict[str, int]:
    folder_count = 0
    bookmark_count = 0
    folder_ops: list[ReplaceOne] = []
    bookmark_ops: list[ReplaceOne] = []
    try:
        for raw in body.folders:
            row = dict(raw)
            row.pop("created_by", None)
            fid = row.pop("id", None) or row.pop("_id", None)
            if not fid:
                fid = new_id()
            doc = {
                "_id": str(fid),
                "created_by": uid,
                "name": row.get("name", "Untitled"),
                "parentId": row.get("parentId"),
                "color": row.get("color"),
                "icon": row.get("icon"),
                "isExpanded": row.get("isExpanded", False),
                "createdAt": int(row.get("createdAt", create_timestamp())),
            }
            folder_ops.append(
                ReplaceOne(
                    {"_id": doc["_id"], "created_by": uid},
                    doc,
                    upsert=True,
                )
            )
            folder_count += 1

        for raw in body.bookmarks:
            row = dict(raw)
            row.pop("created_by", None)
            bid = row.pop("id", None) or row.pop("_id", None)
            if not bid:
                bid = new_id()
            ts = create_timestamp()
            doc = {
                "_id": str(bid),
                "created_by": uid,
                "title": row.get("title", ""),
                "url": row.get("url", ""),
                "description": row.get("description"),
                "favicon": row.get("favicon"),
                "tags": list(row.get("tags") or []),
                "folderId": row.get("folderId"),
                "createdAt": int(row.get("createdAt", ts)),
                "updatedAt": int(row.get("updatedAt", ts)),
            }
            bookmark_ops.append(
                ReplaceOne(
                    {"_id": doc["_id"], "created_by": uid},
                    doc,
                    upsert=True,
                )
            )
            bookmark_count += 1

        if folder_ops:
            await db_manager.bulk_write(FOLDERS, folder_ops, ordered=False)
        if bookmark_ops:
            await db_manager.bulk_write(BOOKMARKS, bookmark_ops, ordered=False)
    except PyMongoError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to import bookmarks."
        ) from exc
    return {"foldersUpserted": folder_count, "bookmarksUpserted": bookmark_count}


async def clear_all_bookmarks(uid: str) -> dict[str, int]:
    br = await db_manager.delete_many(BOOKMARKS, {"created_by": uid})
    fr = await db_manager.delete_many(FOLDERS, {"created_by": uid})
    return {"bookmarksDeleted": br.deleted_count, "foldersDeleted": fr.deleted_count}


async def snapshot(uid: str) -> BookmarkSnapshotOut:
    return BookmarkSnapshotOut(
        bookmarks=await list_bookmarks(uid, folder_id=None),
        folders=await list_folders(uid),
    )


async def list_folders(uid: str, *, skip: int = 0, limit: Optional[int] = None) -> list[BookmarkFolderOut]:
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
    try:
        await db_manager.insert_one(FOLDERS, doc)
    except PyMongoError as exc:
        if is_duplicate_key_error(exc):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT, detail="Folder id already exists."
            ) from exc
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to create folder."
        ) from exc
    return _folder_doc_to_out(doc)


async def update_folder(uid: str, folder_id: str, body: BookmarkFolderUpdate) -> BookmarkFolderOut:
    patch = body.model_dump(exclude_unset=True)
    if not patch:
        return await get_folder(uid, folder_id)
    try:
        result = await db_manager.find_one_and_update(
            FOLDERS,
            {"_id": folder_id, "created_by": uid},
            {"$set": patch},
            return_document=ReturnDocument.AFTER,
        )
    except PyMongoError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to update folder."
        ) from exc
    if not result:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Folder not found.")
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
