from fastapi import APIRouter, Depends, Query, Request

from app.api.routes.json_formatter import services as jf_svc
from app.api.routes.json_formatter.schema import (
    JsonFormatterDocumentCreate,
    JsonFormatterDocumentOut,
    JsonFormatterDocumentUpdate,
)
from app.api.routes.workspaces.middleware import (
    WorkspaceContext,
    get_workspace_ctx,
)

router = APIRouter(prefix="/json-formatter", tags=["json-formatter"])


@router.get("/documents", response_model=list[JsonFormatterDocumentOut], summary="List saved JSON documents")
async def list_documents(
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=200, ge=1, le=1000),
) -> list[JsonFormatterDocumentOut]:
    return await jf_svc.list_documents_paginated(ctx, skip=skip, limit=limit)


@router.post("/documents", response_model=JsonFormatterDocumentOut, summary="Save new JSON document")
async def create_document(
    body: JsonFormatterDocumentCreate,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
) -> JsonFormatterDocumentOut:
    return await jf_svc.create_document(ctx, body)


@router.get("/documents/{document_id}", response_model=JsonFormatterDocumentOut, summary="Get one JSON document")
async def get_document(document_id: str, ctx: WorkspaceContext = Depends(get_workspace_ctx)) -> JsonFormatterDocumentOut:
    return await jf_svc.get_document(ctx, document_id)


@router.patch("/documents/{document_id}", response_model=JsonFormatterDocumentOut, summary="Update JSON document")
async def patch_document(
    document_id: str,
    body: JsonFormatterDocumentUpdate,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
) -> JsonFormatterDocumentOut:
    return await jf_svc.update_document(ctx, document_id, body)


@router.delete("/documents/{document_id}", status_code=204, summary="Delete JSON document")
async def remove_document(document_id: str, ctx: WorkspaceContext = Depends(get_workspace_ctx)) -> None:
    await jf_svc.delete_document(ctx, document_id)
