import asyncio

from fastapi import APIRouter, Depends, Request

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
    ConfigureCorsRequest,
)
from app.api.routes.s3_drive import services as svc
from app.core.limiter import limiter

router = APIRouter(prefix="/s3-drive", tags=["s3-drive"])


# ── Saved connections (encrypted credentials) ─────────────────────────────────

@router.get("/connections", response_model=list[S3ConnectionOut])
async def list_connections(uid: str = Depends(get_current_uid)) -> list[S3ConnectionOut]:
    return await svc.list_connections(uid)


@router.post("/connections", response_model=S3ConnectionOut, status_code=201)
@limiter.limit("20/minute")
async def create_connection(request: Request, body: S3ConnectionCreate, uid: str = Depends(get_current_uid)) -> S3ConnectionOut:
    return await svc.create_connection(uid, body)


@router.get("/connections/{conn_id}", response_model=S3ConnectionOut)
async def get_connection(conn_id: str, uid: str = Depends(get_current_uid)) -> S3ConnectionOut:
    return await svc.get_connection(uid, conn_id)


@router.patch("/connections/{conn_id}", response_model=S3ConnectionOut)
async def update_connection(conn_id: str, body: S3ConnectionUpdate, uid: str = Depends(get_current_uid)) -> S3ConnectionOut:
    return await svc.update_connection(uid, conn_id, body)


@router.delete("/connections/{conn_id}", status_code=204)
async def delete_connection(conn_id: str, uid: str = Depends(get_current_uid)) -> None:
    await svc.delete_connection(uid, conn_id)


# ── S3 operations (credentials sent per-request, never stored plaintext) ──────

@router.post("/operations/buckets", response_model=list[BucketInfo])
@limiter.limit("30/minute")
async def list_buckets(request: Request, body: ListBucketsRequest, uid: str = Depends(get_current_uid)) -> list[BucketInfo]:
    return await asyncio.to_thread(svc.list_buckets, body)


@router.post("/operations/list", response_model=ListObjectsResponse)
@limiter.limit("60/minute")
async def list_objects(request: Request, body: ListObjectsRequest, uid: str = Depends(get_current_uid)) -> ListObjectsResponse:
    return await asyncio.to_thread(svc.list_objects, body)


@router.post("/operations/delete", response_model=dict)
@limiter.limit("20/minute")
async def delete_objects(request: Request, body: DeleteObjectsRequest, uid: str = Depends(get_current_uid)) -> dict:
    return await asyncio.to_thread(svc.delete_objects, body)


@router.post("/operations/create-folder", response_model=dict)
@limiter.limit("30/minute")
async def create_folder(request: Request, body: CreateFolderRequest, uid: str = Depends(get_current_uid)) -> dict:
    return await asyncio.to_thread(svc.create_folder, body)


@router.post("/operations/presigned-download", response_model=PresignedUrlResponse)
@limiter.limit("60/minute")
async def presigned_download(request: Request, body: PresignedDownloadRequest, uid: str = Depends(get_current_uid)) -> PresignedUrlResponse:
    return await asyncio.to_thread(svc.presigned_download, body)


@router.post("/operations/presigned-upload", response_model=PresignedUrlResponse)
@limiter.limit("60/minute")
async def presigned_upload(request: Request, body: PresignedUploadRequest, uid: str = Depends(get_current_uid)) -> PresignedUrlResponse:
    return await asyncio.to_thread(svc.presigned_upload, body)


@router.post("/operations/move", response_model=dict)
@limiter.limit("20/minute")
async def move_object(request: Request, body: MoveObjectRequest, uid: str = Depends(get_current_uid)) -> dict:
    return await asyncio.to_thread(svc.move_object, body)


@router.post("/operations/configure-cors", response_model=dict, summary="Set bucket CORS rules to allow browser presigned URL requests")
@limiter.limit("5/minute")
async def configure_cors(request: Request, body: ConfigureCorsRequest, _uid: str = Depends(get_current_uid)) -> dict:
    return await asyncio.to_thread(svc.configure_bucket_cors, body, body.allowedOrigins)
