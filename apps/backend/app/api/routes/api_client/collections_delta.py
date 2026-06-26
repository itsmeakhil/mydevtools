"""Service + route for the collection-items delta endpoint.

POST /api-client/collections/{collection_id}/items:apply-delta

Applies a list of ops (add / update / delete / move) to a collection's items
tree in-memory, then persists the result in a single atomic update_one call.
Cache is invalidated via bump_version exactly as the existing patch_collection
service does.
"""
from __future__ import annotations

from typing import Any

from bson import ObjectId
from bson.errors import InvalidId
from fastapi import APIRouter, Depends, HTTPException, status
from pymongo import ReturnDocument
from pymongo.errors import PyMongoError

from app.api.routes.api_client.schema import (
    AddItemOp,
    ApiClientCollectionOut,
    ApplyDeltaRequest,
    ApplyDeltaResponse,
    DeleteItemOp,
    MoveItemOp,
    Op,
    UpdateItemOp,
)
from app.api.routes.workspaces.middleware import WorkspaceContext, apply_workspace_filter, get_workspace_ctx
from app.database import db_manager
from app.utils.collection_name import API_CLIENT_COLLECTIONS

router = APIRouter()


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
    )


# ── In-memory tree walkers ────────────────────────────────────────────────────

def _apply_add(
    items: list[dict[str, Any]],
    parent_id: str,
    collection_id: str,
    new_item: dict[str, Any],
    position: int | None,
) -> list[dict[str, Any]]:
    """Insert new_item under parent_id.  parent_id may be the collection root."""
    if parent_id == collection_id:
        # Insert at root level
        if position is None or position >= len(items):
            return items + [new_item]
        result = list(items)
        result.insert(position, new_item)
        return result

    return _add_in_children(items, parent_id, new_item, position)


def _add_in_children(
    items: list[dict[str, Any]],
    parent_id: str,
    new_item: dict[str, Any],
    position: int | None,
) -> list[dict[str, Any]]:
    result = []
    for item in items:
        if item.get("id") == parent_id and item.get("type") == "folder":
            children = list(item.get("items") or [])
            if position is None or position >= len(children):
                children = children + [new_item]
            else:
                children.insert(position, new_item)
            result.append({**item, "items": children})
        elif item.get("type") == "folder":
            result.append({**item, "items": _add_in_children(item.get("items") or [], parent_id, new_item, position)})
        else:
            result.append(item)
    return result


def _apply_update(
    items: list[dict[str, Any]],
    item_id: str,
    patch: dict[str, Any],
) -> tuple[list[dict[str, Any]], bool]:
    """Recursively apply patch to the item with item_id. Returns (new_items, found)."""
    result = []
    found = False
    for item in items:
        if item.get("id") == item_id:
            result.append({**item, **patch})
            found = True
        elif item.get("type") == "folder":
            new_children, child_found = _apply_update(item.get("items") or [], item_id, patch)
            result.append({**item, "items": new_children})
            if child_found:
                found = True
        else:
            result.append(item)
    return result, found


def _apply_delete(
    items: list[dict[str, Any]],
    item_id: str,
) -> tuple[list[dict[str, Any]], bool]:
    """Recursively remove item_id. Returns (new_items, found)."""
    new_items = []
    found = False
    for item in items:
        if item.get("id") == item_id:
            found = True
            # skip (delete)
        elif item.get("type") == "folder":
            new_children, child_found = _apply_delete(item.get("items") or [], item_id)
            new_items.append({**item, "items": new_children})
            if child_found:
                found = True
        else:
            new_items.append(item)
    return new_items, found


def _extract_item(
    items: list[dict[str, Any]],
    item_id: str,
) -> tuple[list[dict[str, Any]], dict[str, Any] | None]:
    """Remove and return item_id from the tree."""
    new_items = []
    extracted: dict[str, Any] | None = None
    for item in items:
        if item.get("id") == item_id:
            extracted = item
        elif item.get("type") == "folder":
            new_children, child_extracted = _extract_item(item.get("items") or [], item_id)
            new_items.append({**item, "items": new_children})
            if child_extracted is not None:
                extracted = child_extracted
        else:
            new_items.append(item)
    return new_items, extracted


def _id_exists_in_tree(items: list[dict[str, Any]], node_id: str) -> bool:
    """Return True if node_id appears anywhere in the tree (any level)."""
    for item in items:
        if item.get("id") == node_id:
            return True
        if item.get("type") == "folder":
            if _id_exists_in_tree(item.get("items") or [], node_id):
                return True
    return False


def _apply_move(
    items: list[dict[str, Any]],
    item_id: str,
    new_parent_id: str,
    new_index: int,
    collection_id: str,
) -> tuple[list[dict[str, Any]], bool]:
    """Move item_id to new_parent_id at new_index. Returns (new_items, success)."""
    # Validate that new_parent_id exists (root or a folder in the tree).
    if new_parent_id != collection_id and not _id_exists_in_tree(items, new_parent_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="move: new_parent_id not found",
        )

    # Step 1: extract the item
    items_without, target = _extract_item(items, item_id)
    if target is None:
        return items, False

    # Step 2: insert at new parent
    new_items = _apply_add(items_without, new_parent_id, collection_id, target, new_index)
    return new_items, True


# ── Service ───────────────────────────────────────────────────────────────────

async def apply_collection_delta(
    ctx: WorkspaceContext,
    collection_id: str,
    ops: list[Op],
) -> ApiClientCollectionOut:
    oid = _parse_oid(collection_id, kind="collection")

    # Fetch + ownership check BEFORE any mutation
    flt = apply_workspace_filter(ctx, {"_id": oid, "created_by": ctx.uid})
    doc = await db_manager.find_one(API_CLIENT_COLLECTIONS, flt)
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Collection not found.")

    items: list[dict[str, Any]] = list(doc.get("items") or [])

    # Apply all ops in-memory (atomic within a single request)
    for op in ops:
        if isinstance(op, AddItemOp):
            items = _apply_add(items, op.parent_id, collection_id, op.item, op.position)

        elif isinstance(op, UpdateItemOp):
            items, found = _apply_update(items, op.item_id, op.patch)
            if not found:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Item {op.item_id!r} not found.",
                )

        elif isinstance(op, DeleteItemOp):
            items, found = _apply_delete(items, op.item_id)
            if not found:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Item {op.item_id!r} not found.",
                )

        elif isinstance(op, MoveItemOp):
            items, ok = _apply_move(items, op.item_id, op.new_parent_id, op.new_index, collection_id)
            if not ok:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Item {op.item_id!r} not found.",
                )

    # Single atomic update
    try:
        updated_doc = await db_manager.find_one_and_update(
            API_CLIENT_COLLECTIONS,
            flt,
            {"$set": {"items": items}},
            return_document=ReturnDocument.AFTER,
        )
    except PyMongoError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update collection.",
        ) from exc

    if not updated_doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Collection not found.")

    # ponytail: cache removed during workspace refactor; re-add with (workspace_id, uid) key if hot

    return _collection_to_out(updated_doc)


# ── Route ─────────────────────────────────────────────────────────────────────

@router.post(
    "/collections/{collection_id}/items:apply-delta",
    response_model=ApplyDeltaResponse,
    summary="Apply delta ops to a collection's items tree",
)
async def apply_delta(
    collection_id: str,
    body: ApplyDeltaRequest,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
) -> ApplyDeltaResponse:
    collection = await apply_collection_delta(ctx, collection_id, body.ops)
    return ApplyDeltaResponse(collection=collection)
