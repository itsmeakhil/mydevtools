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

from pydantic import BaseModel, ConfigDict, Field

from app.utils.collection_name import BOOKMARK_FOLDERS, BOOKMARKS

# Re-export for services
COLLECTION_BOOKMARKS = BOOKMARKS
COLLECTION_BOOKMARK_FOLDERS = BOOKMARK_FOLDERS


class BookmarkBase(BaseModel):
    model_config = ConfigDict(extra="ignore")

    title: str = Field(min_length=1)
    url: str = Field(min_length=1)
    description: str | None = None
    favicon: str | None = None
    tags: list[str] = Field(default_factory=list)
    folderId: str | None = None


class BookmarkCreate(BookmarkBase):
    """Optional ``id`` — if omitted, server generates one (client uses timestamp-random)."""

    id: str | None = None


class BookmarkUpdate(BaseModel):
    model_config = ConfigDict(extra="ignore")

    title: str | None = Field(default=None, min_length=1)
    url: str | None = Field(default=None, min_length=1)
    description: str | None = None
    favicon: str | None = None
    tags: list[str] | None = None
    folderId: str | None = None


class BookmarkMove(BaseModel):
    folderId: str | None = None


class BookmarkOut(BookmarkBase):
    id: str
    createdAt: int
    updatedAt: int
    created_by: str


class BookmarkFolderBase(BaseModel):
    model_config = ConfigDict(extra="ignore")

    name: str = Field(min_length=1)
    parentId: str | None = None
    color: str | None = None
    icon: str | None = None
    isExpanded: bool | None = None


class BookmarkFolderCreate(BookmarkFolderBase):
    id: str | None = None


class BookmarkFolderUpdate(BaseModel):
    model_config = ConfigDict(extra="ignore")

    name: str | None = Field(default=None, min_length=1)
    parentId: str | None = None
    color: str | None = None
    icon: str | None = None
    isExpanded: bool | None = None


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
