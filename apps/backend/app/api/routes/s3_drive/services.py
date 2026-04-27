import random
import string
import time
from typing import Any, Optional

from fastapi import HTTPException, status

try:
    import boto3
    from botocore.config import Config
    from botocore.exceptions import ClientError, BotoCoreError
except ImportError:  # pragma: no cover
    boto3 = None  # type: ignore

try:
    from pymongo.collection import Collection
    from pymongo.errors import PyMongoError
except Exception:  # pragma: no cover
    Collection = Any  # type: ignore
    PyMongoError = Exception  # type: ignore

from app.api.routes.s3_drive.schema import (
    S3ConnectionCreate,
    S3ConnectionUpdate,
    S3ConnectionOut,
    S3Credentials,
    ListObjectsRequest,
    DeleteObjectsRequest,
    CreateFolderRequest,
    PresignedDownloadRequest,
    PresignedUploadRequest,
    MoveObjectRequest,
    ListBucketsRequest,
    S3ObjectItem,
    ListObjectsResponse,
    PresignedUrlResponse,
    BucketInfo,
)
from app.core.db import get_db
from app.utils.collection_name import S3_CONNECTIONS


def _now_ms() -> int:
    return int(time.time() * 1000)


def _new_id() -> str:
    suffix = "".join(random.choices(string.ascii_lowercase + string.digits, k=9))
    return f"{_now_ms()}-{suffix}"


def _col() -> Collection:
    return get_db()[S3_CONNECTIONS]


def _doc_to_out(doc: dict[str, Any]) -> S3ConnectionOut:
    conn_id = str(doc.get("_id", ""))
    created_at = int(doc.get("createdAt", 0)) or _now_ms()
    updated_at = int(doc.get("updatedAt", 0)) or created_at
    return S3ConnectionOut(
        id=conn_id,
        name=str(doc.get("name", "")),
        provider=str(doc.get("provider", "aws")),
        encryptedData=str(doc.get("encryptedData", "")),
        iv=str(doc.get("iv", "")),
        createdAt=created_at,
        updatedAt=updated_at,
    )


# ── Connection CRUD ───────────────────────────────────────────────────────────

def list_connections(uid: str) -> list[S3ConnectionOut]:
    docs = list(_col().find({"created_by": uid}).sort([("updatedAt", -1)]))
    return [_doc_to_out(d) for d in docs]


def create_connection(uid: str, body: S3ConnectionCreate) -> S3ConnectionOut:
    conn_id = _new_id()
    ts = _now_ms()
    created_at = int(body.createdAt) if body.createdAt is not None else ts
    doc: dict[str, Any] = {
        "_id": conn_id,
        "created_by": uid,
        "name": body.name,
        "provider": body.provider,
        "encryptedData": body.encryptedData,
        "iv": body.iv,
        "createdAt": created_at,
        "updatedAt": ts,
    }
    try:
        _col().insert_one(doc)
    except PyMongoError as exc:
        msg = str(exc).lower()
        if "duplicate" in msg or "e11000" in msg:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Connection id collision.") from exc
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to create connection.") from exc
    return _doc_to_out(doc)


def get_connection(uid: str, conn_id: str) -> S3ConnectionOut:
    doc = _col().find_one({"_id": conn_id, "created_by": uid})
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Connection not found.")
    return _doc_to_out(doc)


def update_connection(uid: str, conn_id: str, body: S3ConnectionUpdate) -> S3ConnectionOut:
    patch: dict[str, Any] = {"updatedAt": int(body.updatedAt) if body.updatedAt is not None else _now_ms()}
    if body.name is not None:
        patch["name"] = body.name
    if body.provider is not None:
        patch["provider"] = body.provider
    if body.encryptedData is not None:
        patch["encryptedData"] = body.encryptedData
    if body.iv is not None:
        patch["iv"] = body.iv
    try:
        result = _col().update_one({"_id": conn_id, "created_by": uid}, {"$set": patch})
    except PyMongoError as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to update connection.") from exc
    if result.matched_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Connection not found.")
    return get_connection(uid, conn_id)


def delete_connection(uid: str, conn_id: str) -> None:
    result = _col().delete_one({"_id": conn_id, "created_by": uid})
    if result.deleted_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Connection not found.")


# ── S3 client factory ─────────────────────────────────────────────────────────

def _s3_client(creds: S3Credentials):
    if boto3 is None:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="boto3 not installed.")
    kwargs: dict[str, Any] = {
        "aws_access_key_id": creds.accessKey,
        "aws_secret_access_key": creds.secretKey,
        "region_name": creds.region,
        "config": Config(signature_version="s3v4", connect_timeout=10, read_timeout=30),
    }
    if creds.endpoint:
        kwargs["endpoint_url"] = creds.endpoint
    return boto3.client("s3", **kwargs)


def _s3_error(exc: Exception) -> HTTPException:
    if isinstance(exc, ClientError):
        code = exc.response.get("Error", {}).get("Code", "Unknown")
        msg = exc.response.get("Error", {}).get("Message", str(exc))
        if code in ("NoSuchBucket", "NoSuchKey"):
            return HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=msg)
        if code in ("AccessDenied", "InvalidAccessKeyId", "SignatureDoesNotMatch"):
            return HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=msg)
        return HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=f"S3 error ({code}): {msg}")
    return HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc))


# ── S3 operations ─────────────────────────────────────────────────────────────

def list_buckets(body: ListBucketsRequest) -> list[BucketInfo]:
    client = _s3_client(body.credentials)
    try:
        resp = client.list_buckets()
    except (ClientError, BotoCoreError) as exc:
        raise _s3_error(exc) from exc
    return [
        BucketInfo(
            name=b["Name"],
            creationDate=b.get("CreationDate", "").isoformat() if b.get("CreationDate") else None,
        )
        for b in resp.get("Buckets", [])
    ]


def list_objects(body: ListObjectsRequest) -> ListObjectsResponse:
    client = _s3_client(body.credentials)
    kwargs: dict[str, Any] = {
        "Bucket": body.credentials.bucket,
        "Prefix": body.prefix,
        "Delimiter": body.delimiter,
        "MaxKeys": body.maxKeys,
    }
    if body.continuationToken:
        kwargs["ContinuationToken"] = body.continuationToken
    try:
        resp = client.list_objects_v2(**kwargs)
    except (ClientError, BotoCoreError) as exc:
        raise _s3_error(exc) from exc

    objects: list[S3ObjectItem] = []
    for obj in resp.get("Contents", []):
        key: str = obj["Key"]
        if key == body.prefix:
            continue
        objects.append(S3ObjectItem(
            key=key,
            size=obj.get("Size"),
            lastModified=obj.get("LastModified", "").isoformat() if obj.get("LastModified") else None,
            etag=obj.get("ETag", "").strip('"'),
            isFolder=key.endswith("/"),
        ))

    prefixes = [p.get("Prefix", "") for p in resp.get("CommonPrefixes", [])]

    return ListObjectsResponse(
        objects=objects,
        prefixes=prefixes,
        isTruncated=bool(resp.get("IsTruncated", False)),
        nextContinuationToken=resp.get("NextContinuationToken"),
    )


def delete_objects(body: DeleteObjectsRequest) -> dict[str, int]:
    client = _s3_client(body.credentials)
    to_delete = [{"Key": k} for k in body.keys]
    try:
        resp = client.delete_objects(
            Bucket=body.credentials.bucket,
            Delete={"Objects": to_delete, "Quiet": True},
        )
    except (ClientError, BotoCoreError) as exc:
        raise _s3_error(exc) from exc
    errors = resp.get("Errors", [])
    if errors:
        raise HTTPException(status_code=status.HTTP_207_MULTI_STATUS, detail={"errors": errors})
    return {"deleted": len(to_delete)}


def create_folder(body: CreateFolderRequest) -> dict[str, str]:
    key = body.prefix if body.prefix.endswith("/") else body.prefix + "/"
    client = _s3_client(body.credentials)
    try:
        client.put_object(Bucket=body.credentials.bucket, Key=key, Body=b"")
    except (ClientError, BotoCoreError) as exc:
        raise _s3_error(exc) from exc
    return {"key": key}


def presigned_download(body: PresignedDownloadRequest) -> PresignedUrlResponse:
    client = _s3_client(body.credentials)
    try:
        url = client.generate_presigned_url(
            "get_object",
            Params={"Bucket": body.credentials.bucket, "Key": body.key},
            ExpiresIn=body.expiresIn,
        )
    except (ClientError, BotoCoreError) as exc:
        raise _s3_error(exc) from exc
    return PresignedUrlResponse(url=url, key=body.key)


def presigned_upload(body: PresignedUploadRequest) -> PresignedUrlResponse:
    client = _s3_client(body.credentials)
    try:
        url = client.generate_presigned_url(
            "put_object",
            Params={
                "Bucket": body.credentials.bucket,
                "Key": body.key,
                "ContentType": body.contentType,
            },
            ExpiresIn=body.expiresIn,
        )
    except (ClientError, BotoCoreError) as exc:
        raise _s3_error(exc) from exc
    return PresignedUrlResponse(url=url, key=body.key)


def move_object(body: MoveObjectRequest) -> dict[str, str]:
    client = _s3_client(body.credentials)
    try:
        client.copy_object(
            Bucket=body.credentials.bucket,
            CopySource={"Bucket": body.credentials.bucket, "Key": body.sourceKey},
            Key=body.destinationKey,
        )
        client.delete_object(Bucket=body.credentials.bucket, Key=body.sourceKey)
    except (ClientError, BotoCoreError) as exc:
        raise _s3_error(exc) from exc
    return {"sourceKey": body.sourceKey, "destinationKey": body.destinationKey}
