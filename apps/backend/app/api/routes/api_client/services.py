import time
from typing import Any

from bson import ObjectId
from bson.errors import InvalidId
from fastapi import HTTPException, status
from pymongo.errors import PyMongoError

from app.api.routes.api_client.schema import (
    HISTORY_MAX_ITEMS,
    ApiClientCollectionCreate,
    ApiClientCollectionOut,
    ApiClientCollectionUpdate,
    ApiClientEnvironmentCreate,
    ApiClientEnvironmentOut,
    ApiClientEnvironmentUpdate,
    ApiClientHistoryCreate,
    ApiClientHistoryOut,
    ApiClientPublicMockOut,
    ApiClientPublicMockPublish,
    ApiClientWorkspaceCreate,
    ApiClientWorkspaceOut,
    ApiClientWorkspaceUpdate,
)
from app.api.routes.workspaces.middleware import (
    WorkspaceContext,
    apply_legacy_or_filter,
    apply_workspace_filter,
)
from app.database import db_manager
from app.utils.collection_name import (
    API_CLIENT_COLLECTIONS,
    API_CLIENT_ENVIRONMENTS,
    API_CLIENT_HISTORY,
    API_CLIENT_PUBLIC_MOCKS,
    API_CLIENT_WORKSPACES,
)
from app.utils.crud import safe_delete_one, safe_insert, safe_update_one

import secrets

HISTORY_TRIM_BATCH_SIZE = 500


def _parse_oid(raw: str, *, kind: str) -> ObjectId:
    try:
        return ObjectId(raw)
    except InvalidId as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid {kind} id.",
        ) from exc


def _collection_to_out(doc: dict[str, Any]) -> ApiClientCollectionOut:
    oid = doc.get("_id")
    return ApiClientCollectionOut(
        id=str(oid) if oid is not None else "",
        name=doc.get("name", ""),
        items=list(doc.get("items") or []),
        workspace=doc.get("workspace"),
    )


def _env_to_out(doc: dict[str, Any]) -> ApiClientEnvironmentOut:
    oid = doc.get("_id")
    return ApiClientEnvironmentOut(
        id=str(oid) if oid is not None else "",
        name=doc.get("name", ""),
        variables=list(doc.get("variables") or []),
    )


# ponytail: cache removed during workspace refactor; re-add with (workspace_id, uid) key if hot
async def list_collections(*, ctx: WorkspaceContext) -> list[ApiClientCollectionOut]:
    flt = apply_legacy_or_filter(ctx, {}, user_field="created_by")
    docs = await db_manager.find(
        API_CLIENT_COLLECTIONS,
        flt,
        {"_id": 1, "name": 1, "items": 1, "workspace": 1},
        sort=[("name", 1), ("_id", 1)],
    )
    return [_collection_to_out(d) for d in docs]


async def create_collection(ctx: WorkspaceContext, body: ApiClientCollectionCreate) -> ApiClientCollectionOut:
    doc: dict[str, Any] = {
        "created_by": ctx.uid,
        "org_id": ctx.org_id,
        "workspace_id": ctx.workspace_id,
        "owner_uid": ctx.uid,
        "name": body.name,
        "items": [],
    }
    await safe_insert(API_CLIENT_COLLECTIONS, doc, name="Collection")
    return _collection_to_out(doc)


async def patch_collection(ctx: WorkspaceContext, collection_id: str, body: ApiClientCollectionUpdate) -> ApiClientCollectionOut:
    oid = _parse_oid(collection_id, kind="collection")
    patch = body.model_dump(exclude_unset=True)
    if not patch:
        flt = apply_workspace_filter(ctx, {"_id": oid, "created_by": ctx.uid})
        doc = await db_manager.find_one(API_CLIENT_COLLECTIONS, flt)
        if not doc:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Collection not found.")
        return _collection_to_out(doc)
    flt = apply_workspace_filter(ctx, {"_id": oid, "created_by": ctx.uid})
    doc = await safe_update_one(
        API_CLIENT_COLLECTIONS, flt, patch, name="Collection"
    )
    return _collection_to_out(doc)


async def delete_collection(ctx: WorkspaceContext, collection_id: str) -> None:
    oid = _parse_oid(collection_id, kind="collection")
    flt = apply_workspace_filter(ctx, {"_id": oid, "created_by": ctx.uid})
    await safe_delete_one(API_CLIENT_COLLECTIONS, flt, name="Collection")


# ponytail: cache removed during workspace refactor; re-add with (workspace_id, uid) key if hot
async def list_environments(*, ctx: WorkspaceContext) -> list[ApiClientEnvironmentOut]:
    flt = apply_legacy_or_filter(ctx, {}, user_field="created_by")
    docs = await db_manager.find(
        API_CLIENT_ENVIRONMENTS,
        flt,
        {"_id": 1, "name": 1, "variables": 1},
        sort=[("name", 1), ("_id", 1)],
    )
    return [_env_to_out(d) for d in docs]


async def create_environment(ctx: WorkspaceContext, body: ApiClientEnvironmentCreate) -> ApiClientEnvironmentOut:
    doc: dict[str, Any] = {
        "created_by": ctx.uid,
        "org_id": ctx.org_id,
        "workspace_id": ctx.workspace_id,
        "owner_uid": ctx.uid,
        "name": body.name,
        "variables": [],
    }
    await safe_insert(API_CLIENT_ENVIRONMENTS, doc, name="Environment")
    return _env_to_out(doc)


async def patch_environment(ctx: WorkspaceContext, environment_id: str, body: ApiClientEnvironmentUpdate) -> ApiClientEnvironmentOut:
    oid = _parse_oid(environment_id, kind="environment")
    patch = body.model_dump(exclude_unset=True)
    if not patch:
        flt = apply_workspace_filter(ctx, {"_id": oid, "created_by": ctx.uid})
        doc = await db_manager.find_one(API_CLIENT_ENVIRONMENTS, flt)
        if not doc:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Environment not found.")
        return _env_to_out(doc)
    flt = apply_workspace_filter(ctx, {"_id": oid, "created_by": ctx.uid})
    doc = await safe_update_one(
        API_CLIENT_ENVIRONMENTS, flt, patch, name="Environment"
    )
    return _env_to_out(doc)


async def delete_environment(ctx: WorkspaceContext, environment_id: str) -> None:
    oid = _parse_oid(environment_id, kind="environment")
    flt = apply_workspace_filter(ctx, {"_id": oid, "created_by": ctx.uid})
    await safe_delete_one(API_CLIENT_ENVIRONMENTS, flt, name="Environment")


def _history_doc_to_out(doc: dict[str, Any]) -> ApiClientHistoryOut:
    oid = doc.get("_id")
    ts = doc.get("timestamp")
    if not isinstance(ts, int):
        ts = 0
    return ApiClientHistoryOut(
        id=str(oid) if oid is not None else "",
        method=str(doc.get("method", "GET")),
        url=str(doc.get("url", "")),
        params=list(doc.get("params") or []),
        headers=list(doc.get("headers") or []),
        body=dict(doc.get("body") or {}),
        auth=dict(doc.get("auth") or {}),
        name=str(doc.get("name", "")),
        timestamp=ts,
        status=doc.get("status") if isinstance(doc.get("status"), int) else None,
    )


async def trim_history(ctx: WorkspaceContext) -> None:
    flt = apply_legacy_or_filter(ctx, {}, user_field="created_by")
    stale_docs = await db_manager.find(
        API_CLIENT_HISTORY,
        flt,
        {"_id": 1},
        sort=[("timestamp", -1), ("_id", -1)],
        skip=HISTORY_MAX_ITEMS,
        limit=HISTORY_TRIM_BATCH_SIZE,
    )
    if not stale_docs:
        return
    ids = [d["_id"] for d in stale_docs]
    del_flt = apply_workspace_filter(ctx, {"_id": {"$in": ids}, "created_by": ctx.uid})
    await db_manager.delete_many(API_CLIENT_HISTORY, del_flt)


# ponytail: cache removed during workspace refactor; re-add with (workspace_id, uid) key if hot
async def list_history(*, ctx: WorkspaceContext, limit: int = HISTORY_MAX_ITEMS) -> list[ApiClientHistoryOut]:
    lim = max(1, min(limit, HISTORY_MAX_ITEMS))
    flt = apply_legacy_or_filter(ctx, {}, user_field="created_by")
    docs = await db_manager.find(API_CLIENT_HISTORY, flt, sort=[("timestamp", -1)], limit=lim)
    return [_history_doc_to_out(d) for d in docs]


async def create_history(ctx: WorkspaceContext, body: ApiClientHistoryCreate) -> ApiClientHistoryOut:
    ts = body.timestamp if body.timestamp is not None else int(time.time() * 1000)
    doc: dict[str, Any] = {
        "created_by": ctx.uid,
        "org_id": ctx.org_id,
        "workspace_id": ctx.workspace_id,
        "owner_uid": ctx.uid,
        "method": body.method,
        "url": body.url,
        "params": body.params,
        "headers": body.headers,
        "body": body.body,
        "auth": body.auth,
        "name": body.name,
        "timestamp": ts,
        "status": body.status,
    }
    await safe_insert(API_CLIENT_HISTORY, doc, name="History entry")
    return _history_doc_to_out(doc)


async def delete_history_entry(ctx: WorkspaceContext, entry_id: str) -> None:
    oid = _parse_oid(entry_id, kind="history")
    flt = apply_workspace_filter(ctx, {"_id": oid, "created_by": ctx.uid})
    await safe_delete_one(API_CLIENT_HISTORY, flt, name="History entry")


async def clear_history(ctx: WorkspaceContext) -> None:
    flt = apply_workspace_filter(ctx, {"created_by": ctx.uid})
    try:
        await db_manager.delete_many(API_CLIENT_HISTORY, flt)
    except PyMongoError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to clear history."
        ) from exc


# ── Public mocks ─────────────────────────────────────────────────────────────
#
# API_CLIENT_PUBLIC_MOCKS is NOT scoped to workspace for reads. Each published
# mock is globally readable by its mock_id (the id IS the credential — see
# get_public_mock_anonymous). The owner's management operations (list/publish/
# delete) ARE user-scoped via created_by, but we do NOT apply workspace filter
# here because:
#   1. Mocks are meant to be shareable across workspace boundaries.
#   2. Scoping by workspace_id would break the anonymous read path.
#   3. The mock_id token (~144 bits of entropy) is the access control boundary.
# Ownership is tracked by `created_by` only; the collection is NOT stamped with
# org_id / workspace_id / owner_uid.


def _mock_doc_to_out(doc: dict[str, Any]) -> ApiClientPublicMockOut:
    return ApiClientPublicMockOut(
        mock_id=str(doc.get("mock_id", "")),
        name=str(doc.get("name", "")),
        items=list(doc.get("items") or []),
        collection_id=doc.get("collection_id"),
        created_at=int(doc.get("created_at", 0)),
    )


def _generate_mock_id() -> str:
    """24 chars of url-safe base64 → ~144 bits of entropy. Acts as the public token."""

    return secrets.token_urlsafe(18)


async def list_public_mocks(*, uid: str) -> list[ApiClientPublicMockOut]:
    docs = await db_manager.find(
        API_CLIENT_PUBLIC_MOCKS,
        {"created_by": uid},
        sort=[("created_at", -1)],
    )
    return [_mock_doc_to_out(d) for d in docs]


async def publish_public_mock(uid: str, body: ApiClientPublicMockPublish) -> ApiClientPublicMockOut:
    doc: dict[str, Any] = {
        "created_by": uid,
        "collection_id": body.collection_id,
        "mock_id": _generate_mock_id(),
        "name": body.name,
        "items": body.items,
        "created_at": int(time.time() * 1000),
    }
    await safe_insert(API_CLIENT_PUBLIC_MOCKS, doc, name="Public mock")
    return _mock_doc_to_out(doc)


async def delete_public_mock(uid: str, mock_id: str) -> None:
    await safe_delete_one(
        API_CLIENT_PUBLIC_MOCKS, {"mock_id": mock_id, "created_by": uid}, name="Public mock"
    )


async def get_public_mock_anonymous(mock_id: str) -> ApiClientPublicMockOut | None:
    """Read a published mock by id — NO auth, by design. The id is the credential."""

    doc = await db_manager.find_one(API_CLIENT_PUBLIC_MOCKS, {"mock_id": mock_id})
    return _mock_doc_to_out(doc) if doc else None


# ── Workspaces (API Client's internal grouping) ───────────────────────────────
#
# API_CLIENT_WORKSPACES stores the API Client tool's own "workspace" concept
# (grouping of API requests) — completely separate from our global Workspaces
# feature. These are per-user data so they ARE stamped with org_id/workspace_id.


def _ws_doc_to_out(doc: dict[str, Any]) -> ApiClientWorkspaceOut:
    oid = doc.get("_id")
    return ApiClientWorkspaceOut(
        id=str(oid) if oid is not None else "",
        name=str(doc.get("name", "")),
        created_at=int(doc.get("created_at", 0)),
    )


async def list_workspaces(*, ctx: WorkspaceContext) -> list[ApiClientWorkspaceOut]:
    flt = apply_legacy_or_filter(ctx, {}, user_field="created_by")
    docs = await db_manager.find(
        API_CLIENT_WORKSPACES,
        flt,
        sort=[("name", 1), ("_id", 1)],
    )
    return [_ws_doc_to_out(d) for d in docs]


async def create_workspace(ctx: WorkspaceContext, body: ApiClientWorkspaceCreate) -> ApiClientWorkspaceOut:
    doc: dict[str, Any] = {
        "created_by": ctx.uid,
        "org_id": ctx.org_id,
        "workspace_id": ctx.workspace_id,
        "owner_uid": ctx.uid,
        "name": body.name,
        "created_at": int(time.time() * 1000),
    }
    await safe_insert(API_CLIENT_WORKSPACES, doc, name="Workspace")
    return _ws_doc_to_out(doc)


async def patch_workspace(ctx: WorkspaceContext, workspace_id: str, body: ApiClientWorkspaceUpdate) -> ApiClientWorkspaceOut:
    oid = _parse_oid(workspace_id, kind="workspace")
    patch = body.model_dump(exclude_unset=True)
    if not patch:
        flt = apply_workspace_filter(ctx, {"_id": oid, "created_by": ctx.uid})
        doc = await db_manager.find_one(API_CLIENT_WORKSPACES, flt)
        if not doc:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Workspace not found.")
        return _ws_doc_to_out(doc)
    flt = apply_workspace_filter(ctx, {"_id": oid, "created_by": ctx.uid})
    doc = await safe_update_one(
        API_CLIENT_WORKSPACES, flt, patch, name="Workspace"
    )
    return _ws_doc_to_out(doc)


async def delete_workspace(ctx: WorkspaceContext, workspace_id: str) -> None:
    oid = _parse_oid(workspace_id, kind="workspace")
    # Clear workspace pointer from any collections that reference it.
    # Use legacy-or filter so we don't orphan pre-migration collections.
    col_flt = apply_legacy_or_filter(
        ctx, {"workspace": workspace_id}, user_field="created_by"
    )
    await db_manager.update_many(
        API_CLIENT_COLLECTIONS,
        col_flt,
        {"$set": {"workspace": None}},
    )
    flt = apply_workspace_filter(ctx, {"_id": oid, "created_by": ctx.uid})
    await safe_delete_one(
        API_CLIENT_WORKSPACES, flt, name="Workspace"
    )
