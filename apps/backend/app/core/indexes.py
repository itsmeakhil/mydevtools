from app.core.db import get_db
from app.utils.collection_name import (
    API_CLIENT_HISTORY,
    API_CLIENT_COLLECTIONS,
    API_CLIENT_ENVIRONMENTS,
    BOOKMARK_FOLDERS,
    BOOKMARKS,
    CODE_SNIPPETS,
    NOTES,
    PROJECTS,
    TASKS,
    USERS,
)


def ensure_indexes() -> None:
    db = get_db()

    db[USERS].create_index("refresh_token_hash", sparse=True, background=True)
    db[USERS].create_index("username", unique=True, sparse=True, background=True)

    db[TASKS].create_index(
        [("created_by", 1), ("status", 1), ("statusOrder", 1), ("createdAt", -1)],
        background=True,
    )
    db[TASKS].create_index(
        [("created_by", 1), ("projectId", 1), ("status", 1), ("statusOrder", 1)],
        background=True,
    )
    db[PROJECTS].create_index(
        [("created_by", 1), ("createdAt", 1)],
        background=True,
    )

    db[BOOKMARKS].create_index(
        [("created_by", 1), ("folderId", 1)],
        background=True,
    )
    db[BOOKMARKS].create_index(
        [("created_by", 1), ("updatedAt", -1)],
        background=True,
    )
    db[BOOKMARK_FOLDERS].create_index(
        [("created_by", 1), ("parentId", 1)],
        background=True,
    )
    db[BOOKMARK_FOLDERS].create_index(
        [("created_by", 1), ("createdAt", 1)],
        background=True,
    )

    db[CODE_SNIPPETS].create_index(
        [("created_by", 1), ("updatedAt", -1)],
        background=True,
    )

    db[NOTES].create_index(
        [("created_by", 1), ("updatedAt", -1)],
        background=True,
    )

    db[API_CLIENT_HISTORY].create_index(
        [("created_by", 1), ("timestamp", -1)],
        background=True,
    )

    db[API_CLIENT_COLLECTIONS].create_index(
        [("created_by", 1), ("name", 1), ("_id", 1)],
        background=True,
    )
    db[API_CLIENT_ENVIRONMENTS].create_index(
        [("created_by", 1), ("name", 1), ("_id", 1)],
        background=True,
    )
