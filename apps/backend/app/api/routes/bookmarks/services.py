import random
import string
import time
from typing import Any

from fastapi import HTTPException, status
from pymongo.collection import Collection
from pymongo.errors import PyMongoError
from pymongo import ReturnDocument

from app.api.routes.bookmarks.schema import (
    COLLECTION_BOOKMARK_FOLDERS,
    COLLECTION_BOOKMARKS,
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
from app.core.db import get_db


def now_ms() -> int:
    return int(time.time() * 1000)


def new_client_style_id() -> str:
    suffix = "".join(random.choices(string.ascii_lowercase + string.digits, k=9))
    return f"{now_ms()}-{suffix}"


def _bookmarks_col() -> Collection:
    return get_db()[COLLECTION_BOOKMARKS]


def _folders_col() -> Collection:
    return get_db()[COLLECTION_BOOKMARK_FOLDERS]


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


def _descendant_folder_ids(root_id: str, folders: list[dict[str, Any]]) -> list[str]:
    children = [str(f["_id"]) for f in folders if f.get("parentId") == root_id]
    out: list[str] = []
    for cid in children:
        out.append(cid)
        out.extend(_descendant_folder_ids(cid, folders))
    return out


def list_bookmarks(
    uid: str,
    *,
    folder_id: str | None = None,
) -> list[BookmarkOut]:
    col = _bookmarks_col()
    q: dict[str, Any] = {"created_by": uid}
    if folder_id == "uncategorized":
        q["$or"] = [{"folderId": None}, {"folderId": {"$exists": False}}]
    elif folder_id is not None and folder_id != "":
        q["folderId"] = folder_id

    cursor = col.find(q).sort([("updatedAt", -1), ("createdAt", -1)])
    return [_bookmark_doc_to_out(d) for d in cursor]


def get_bookmark(uid: str, bookmark_id: str) -> BookmarkOut:
    col = _bookmarks_col()
    doc = col.find_one({"_id": bookmark_id, "created_by": uid})
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Bookmark not found.")
    return _bookmark_doc_to_out(doc)


def create_bookmark(uid: str, body: BookmarkCreate) -> BookmarkOut:
    bid = body.id or new_client_style_id()
    ts = now_ms()
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
        _bookmarks_col().insert_one(doc)
    except PyMongoError as exc:
        if "duplicate" in str(exc).lower() or "E11000" in str(exc):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Bookmark id already exists.",
            ) from exc
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create bookmark.",
        ) from exc
    return _bookmark_doc_to_out(doc)


def update_bookmark(uid: str, bookmark_id: str, body: BookmarkUpdate) -> BookmarkOut:
    col = _bookmarks_col()
    patch = body.model_dump(exclude_unset=True)
    if not patch:
        return get_bookmark(uid, bookmark_id)
    patch["updatedAt"] = now_ms()
    try:
        result = col.find_one_and_update(
            {"_id": bookmark_id, "created_by": uid},
            {"$set": patch},
            return_document=ReturnDocument.AFTER,
        )
    except PyMongoError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update bookmark.",
        ) from exc
    if not result:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Bookmark not found.")
    return _bookmark_doc_to_out(result)


def move_bookmark(uid: str, bookmark_id: str, body: BookmarkMove) -> BookmarkOut:
    return update_bookmark(
        uid,
        bookmark_id,
        BookmarkUpdate(folderId=body.folderId),
    )


def delete_bookmark(uid: str, bookmark_id: str) -> None:
    col = _bookmarks_col()
    result = col.delete_one({"_id": bookmark_id, "created_by": uid})
    if result.deleted_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Bookmark not found.")


def import_bookmarks(uid: str, body: BookmarkImportBody) -> dict[str, int]:
    """Upsert folders then bookmarks (same merge semantics as client ``importBookmarks``)."""
    fcol = _folders_col()
    bcol = _bookmarks_col()
    folder_count = 0
    bookmark_count = 0
    try:
        for raw in body.folders:
            row = dict(raw)
            row.pop("created_by", None)
            fid = row.pop("id", None) or row.pop("_id", None)
            if not fid:
                fid = new_client_style_id()
            doc = {
                "_id": str(fid),
                "created_by": uid,
                "name": row.get("name", "Untitled"),
                "parentId": row.get("parentId"),
                "color": row.get("color"),
                "icon": row.get("icon"),
                "isExpanded": row.get("isExpanded", False),
                "createdAt": int(row.get("createdAt", now_ms())),
            }
            fcol.replace_one({"_id": doc["_id"], "created_by": uid}, doc, upsert=True)
            folder_count += 1

        for raw in body.bookmarks:
            row = dict(raw)
            row.pop("created_by", None)
            bid = row.pop("id", None) or row.pop("_id", None)
            if not bid:
                bid = new_client_style_id()
            ts = now_ms()
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
            bcol.replace_one({"_id": doc["_id"], "created_by": uid}, doc, upsert=True)
            bookmark_count += 1
    except PyMongoError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to import bookmarks.",
        ) from exc
    return {"foldersUpserted": folder_count, "bookmarksUpserted": bookmark_count}


def clear_all_bookmarks(uid: str) -> dict[str, int]:
    bcol = _bookmarks_col()
    fcol = _folders_col()
    br = bcol.delete_many({"created_by": uid})
    fr = fcol.delete_many({"created_by": uid})
    return {"bookmarksDeleted": br.deleted_count, "foldersDeleted": fr.deleted_count}


def snapshot(uid: str) -> BookmarkSnapshotOut:
    return BookmarkSnapshotOut(
        bookmarks=list_bookmarks(uid, folder_id=None),
        folders=list_folders(uid),
    )


def list_folders(uid: str) -> list[BookmarkFolderOut]:
    col = _folders_col()
    cursor = col.find({"created_by": uid}).sort("createdAt", 1)
    return [_folder_doc_to_out(d) for d in cursor]


def get_folder(uid: str, folder_id: str) -> BookmarkFolderOut:
    col = _folders_col()
    doc = col.find_one({"_id": folder_id, "created_by": uid})
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Folder not found.")
    return _folder_doc_to_out(doc)


def create_folder(uid: str, body: BookmarkFolderCreate) -> BookmarkFolderOut:
    fid = body.id or new_client_style_id()
    ts = now_ms()
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
        _folders_col().insert_one(doc)
    except PyMongoError as exc:
        if "duplicate" in str(exc).lower() or "E11000" in str(exc):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Folder id already exists.",
            ) from exc
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create folder.",
        ) from exc
    return _folder_doc_to_out(doc)


def update_folder(uid: str, folder_id: str, body: BookmarkFolderUpdate) -> BookmarkFolderOut:
    col = _folders_col()
    patch = body.model_dump(exclude_unset=True)
    if not patch:
        return get_folder(uid, folder_id)
    try:
        result = col.find_one_and_update(
            {"_id": folder_id, "created_by": uid},
            {"$set": patch},
            return_document=ReturnDocument.AFTER,
        )
    except PyMongoError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update folder.",
        ) from exc
    if not result:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Folder not found.")
    return _folder_doc_to_out(result)


def set_folder_expanded(uid: str, folder_id: str, is_expanded: bool) -> BookmarkFolderOut:
    return update_folder(uid, folder_id, BookmarkFolderUpdate(isExpanded=is_expanded))


def delete_folder(uid: str, folder_id: str) -> None:
    fcol = _folders_col()
    bcol = _bookmarks_col()
    all_folders = list(fcol.find({"created_by": uid}))
    to_remove = [folder_id, *_descendant_folder_ids(folder_id, all_folders)]
    try:
        fcol.delete_many({"_id": {"$in": to_remove}, "created_by": uid})
        bcol.update_many(
            {"created_by": uid, "folderId": {"$in": to_remove}},
            {"$set": {"folderId": None, "updatedAt": now_ms()}},
        )
    except PyMongoError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete folder.",
        ) from exc
