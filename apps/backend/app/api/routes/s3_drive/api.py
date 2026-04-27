from fastapi import APIRouter, Depends

from app.api.routes.auth.services import get_current_uid
from app.api.routes.s3_drive.schema import (
    S3ConnectionCreate,
    S3ConnectionOut,
    S3ConnectionUpdate,
    ListObjectsRequest,
    ListObjectsResponse,
    DeleteObjectsRequest,
    CreateFolderRequest,
    PresignedDownloadRequest,
    PresignedUploadRequest,
    PresignedUrlResponse,
    MoveObjectRequest,
    ListBucketsRequest,
    BucketInfo,
)
from app.api.routes.s3_drive import services as svc

router = APIRouter(prefix="/s3-drive", tags=["s3-drive"])


# ── Saved connections (encrypted credentials) ─────────────────────────────────

@router.get("/connections", response_model=list[S3ConnectionOut])
def list_connections(uid: str = Depends(get_current_uid)) -> list[S3ConnectionOut]:
    return svc.list_connections(uid)


@router.post("/connections", response_model=S3ConnectionOut, status_code=201)
def create_connection(body: S3ConnectionCreate, uid: str = Depends(get_current_uid)) -> S3ConnectionOut:
    return svc.create_connection(uid, body)


@router.get("/connections/{conn_id}", response_model=S3ConnectionOut)
def get_connection(conn_id: str, uid: str = Depends(get_current_uid)) -> S3ConnectionOut:
    return svc.get_connection(uid, conn_id)


@router.patch("/connections/{conn_id}", response_model=S3ConnectionOut)
def update_connection(conn_id: str, body: S3ConnectionUpdate, uid: str = Depends(get_current_uid)) -> S3ConnectionOut:
    return svc.update_connection(uid, conn_id, body)


@router.delete("/connections/{conn_id}", status_code=204)
def delete_connection(conn_id: str, uid: str = Depends(get_current_uid)) -> None:
    svc.delete_connection(uid, conn_id)


# ── S3 operations (credentials sent per-request, never stored plaintext) ──────

@router.post("/operations/buckets", response_model=list[BucketInfo])
def list_buckets(body: ListBucketsRequest, uid: str = Depends(get_current_uid)) -> list[BucketInfo]:
    return svc.list_buckets(body)


@router.post("/operations/list", response_model=ListObjectsResponse)
def list_objects(body: ListObjectsRequest, uid: str = Depends(get_current_uid)) -> ListObjectsResponse:
    return svc.list_objects(body)


@router.post("/operations/delete", response_model=dict)
def delete_objects(body: DeleteObjectsRequest, uid: str = Depends(get_current_uid)) -> dict:
    return svc.delete_objects(body)


@router.post("/operations/create-folder", response_model=dict)
def create_folder(body: CreateFolderRequest, uid: str = Depends(get_current_uid)) -> dict:
    return svc.create_folder(body)


@router.post("/operations/presigned-download", response_model=PresignedUrlResponse)
def presigned_download(body: PresignedDownloadRequest, uid: str = Depends(get_current_uid)) -> PresignedUrlResponse:
    return svc.presigned_download(body)


@router.post("/operations/presigned-upload", response_model=PresignedUrlResponse)
def presigned_upload(body: PresignedUploadRequest, uid: str = Depends(get_current_uid)) -> PresignedUrlResponse:
    return svc.presigned_upload(body)


@router.post("/operations/move", response_model=dict)
def move_object(body: MoveObjectRequest, uid: str = Depends(get_current_uid)) -> dict:
    return svc.move_object(body)
