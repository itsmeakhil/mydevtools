from fastapi import APIRouter, Depends

from app.api.routes.auth.services import get_current_uid
from app.api.routes.json_formatter import services as jf_svc
from app.api.routes.json_formatter.schema import (
    JsonFormatterDocumentCreate,
    JsonFormatterDocumentOut,
    JsonFormatterDocumentUpdate,
)

router = APIRouter(prefix="/json-formatter", tags=["json-formatter"])


@router.get("/documents", response_model=list[JsonFormatterDocumentOut], summary="List saved JSON documents")
def list_documents(uid: str = Depends(get_current_uid)) -> list[JsonFormatterDocumentOut]:
    return jf_svc.list_documents(uid)


@router.post("/documents", response_model=JsonFormatterDocumentOut, summary="Save new JSON document")
def create_document(
    body: JsonFormatterDocumentCreate,
    uid: str = Depends(get_current_uid),
) -> JsonFormatterDocumentOut:
    return jf_svc.create_document(uid, body)


@router.get("/documents/{document_id}", response_model=JsonFormatterDocumentOut, summary="Get one JSON document")
def get_document(document_id: str, uid: str = Depends(get_current_uid)) -> JsonFormatterDocumentOut:
    return jf_svc.get_document(uid, document_id)


@router.patch("/documents/{document_id}", response_model=JsonFormatterDocumentOut, summary="Update JSON document")
def patch_document(
    document_id: str,
    body: JsonFormatterDocumentUpdate,
    uid: str = Depends(get_current_uid),
) -> JsonFormatterDocumentOut:
    return jf_svc.update_document(uid, document_id, body)


@router.delete("/documents/{document_id}", status_code=204, summary="Delete JSON document")
def remove_document(document_id: str, uid: str = Depends(get_current_uid)) -> None:
    jf_svc.delete_document(uid, document_id)
