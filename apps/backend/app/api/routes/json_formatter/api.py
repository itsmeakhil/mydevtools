from fastapi import APIRouter, Depends, Query

from app.api.routes.auth.services import get_current_uid
from app.api.routes.json_formatter import services as jf_svc
from app.api.routes.json_formatter.schema import (
    JsonFormatterDocumentCreate,
    JsonFormatterDocumentOut,
    JsonFormatterDocumentUpdate,
)

router = APIRouter(prefix="/json-formatter", tags=["json-formatter"])


@router.get("/documents", response_model=list[JsonFormatterDocumentOut], summary="List saved JSON documents")
async def list_documents(
    uid: str = Depends(get_current_uid),
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=200, ge=1, le=1000),
) -> list[JsonFormatterDocumentOut]:
    return await jf_svc.list_documents_paginated(uid, skip=skip, limit=limit)


@router.post("/documents", response_model=JsonFormatterDocumentOut, summary="Save new JSON document")
async def create_document(
    body: JsonFormatterDocumentCreate,
    uid: str = Depends(get_current_uid),
) -> JsonFormatterDocumentOut:
    return await jf_svc.create_document(uid, body)


@router.get("/documents/{document_id}", response_model=JsonFormatterDocumentOut, summary="Get one JSON document")
async def get_document(document_id: str, uid: str = Depends(get_current_uid)) -> JsonFormatterDocumentOut:
    return await jf_svc.get_document(uid, document_id)


@router.patch("/documents/{document_id}", response_model=JsonFormatterDocumentOut, summary="Update JSON document")
async def patch_document(
    document_id: str,
    body: JsonFormatterDocumentUpdate,
    uid: str = Depends(get_current_uid),
) -> JsonFormatterDocumentOut:
    return await jf_svc.update_document(uid, document_id, body)


@router.delete("/documents/{document_id}", status_code=204, summary="Delete JSON document")
async def remove_document(document_id: str, uid: str = Depends(get_current_uid)) -> None:
    await jf_svc.delete_document(uid, document_id)
