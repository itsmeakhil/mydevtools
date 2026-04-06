"""
Bookmarks data model — matches ``Bookmark`` / ``BookmarkFolder`` in
``apps/web/src/store/bookmark-store.ts``.

The web app currently persists via Zustand + localStorage only (no Firestore).
If you add Firestore later, use top-level collections with a ``created_by`` field
(same pattern as ``tasks`` / ``projects``):

- ``bookmarks`` — documents with string IDs (client-generated, same as today).
- ``bookmarkFolders`` — nested folders via ``parentId`` (null = root).

Stored fields use the same names as the client (camelCase + ``created_by``).
``createdAt`` / ``updatedAt`` are Unix ms integers, matching the store.

Recommended indexes::

    db.bookmarks.create_index([("created_by", 1), ("folderId", 1)])
    db.bookmarks.create_index([("created_by", 1), ("updatedAt", -1)])
    db.bookmarkFolders.create_index([("created_by", 1), ("parentId", 1)])
    db.bookmarkFolders.create_index([("created_by", 1), ("createdAt", 1)])
"""

from typing import Any, Optional

from pydantic import BaseModel, ConfigDict, Field

from app.utils.collection_name import BOOKMARK_FOLDERS, BOOKMARKS

# Re-export for services
COLLECTION_BOOKMARKS = BOOKMARKS
COLLECTION_BOOKMARK_FOLDERS = BOOKMARK_FOLDERS


class BookmarkBase(BaseModel):
    model_config = ConfigDict(extra="ignore")

    title: str = Field(min_length=1)
    url: str = Field(min_length=1)
    description: Optional[str] = None
    favicon: Optional[str] = None
    tags: list[str] = Field(default_factory=list)
    folderId: Optional[str] = None


class BookmarkCreate(BookmarkBase):
    """Optional ``id`` — if omitted, server generates one (client uses timestamp-random)."""

    id: Optional[str] = None


class BookmarkUpdate(BaseModel):
    model_config = ConfigDict(extra="ignore")

    title: Optional[str] = Field(default=None, min_length=1)
    url: Optional[str] = Field(default=None, min_length=1)
    description: Optional[str] = None
    favicon: Optional[str] = None
    tags: Optional[list[str]] = None
    folderId: Optional[str] = None


class BookmarkMove(BaseModel):
    folderId: Optional[str] = None


class BookmarkOut(BookmarkBase):
    id: str
    createdAt: int
    updatedAt: int
    created_by: str


class BookmarkFolderBase(BaseModel):
    model_config = ConfigDict(extra="ignore")

    name: str = Field(min_length=1)
    parentId: Optional[str] = None
    color: Optional[str] = None
    icon: Optional[str] = None
    isExpanded: Optional[bool] = None


class BookmarkFolderCreate(BookmarkFolderBase):
    id: Optional[str] = None


class BookmarkFolderUpdate(BaseModel):
    model_config = ConfigDict(extra="ignore")

    name: Optional[str] = Field(default=None, min_length=1)
    parentId: Optional[str] = None
    color: Optional[str] = None
    icon: Optional[str] = None
    isExpanded: Optional[bool] = None


class BookmarkFolderExpanded(BaseModel):
    isExpanded: bool


class BookmarkFolderOut(BookmarkFolderBase):
    id: str
    createdAt: int
    created_by: str


class BookmarkImportBody(BaseModel):
    """Same shape as ``exportBookmarksToJSON`` / ``parseBookmarkJSON`` output."""

    bookmarks: list[dict] = Field(default_factory=list)
    folders: list[dict] = Field(default_factory=list)


class BookmarkSnapshotOut(BaseModel):
    bookmarks: list[BookmarkOut]
    folders: list[BookmarkFolderOut]
