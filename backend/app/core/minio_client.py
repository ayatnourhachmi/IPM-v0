"""MinIO S3-compatible document storage helpers."""

from __future__ import annotations

from datetime import datetime, timezone
from io import BytesIO

from minio import Minio

from app.core.config import settings

DEFAULT_DOCUMENT_BUCKET = "ipm-documents"

_client: Minio | None = None


def get_minio_client() -> Minio:
    """Return the singleton MinIO client."""
    global _client
    if _client is None:
        _client = Minio(
            endpoint=settings.minio_endpoint,
            access_key=settings.minio_access_key,
            secret_key=settings.minio_secret_key,
            secure=settings.minio_secure,
        )
    return _client


def ensure_bucket(bucket_name: str = DEFAULT_DOCUMENT_BUCKET) -> None:
    """Create the default bucket if it does not exist."""
    client = get_minio_client()
    if not client.bucket_exists(bucket_name):
        client.make_bucket(bucket_name)


def store_exported_dossier(
    *,
    need_id: str,
    filename: str,
    content: bytes,
    content_type: str,
    bucket_name: str = DEFAULT_DOCUMENT_BUCKET,
) -> str:
    """Store an exported PoC dossier in MinIO and return its object name."""
    ensure_bucket(bucket_name)
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    safe_need_id = need_id.strip().lower().replace("/", "-") or "unknown-need"
    safe_filename = filename.strip().replace("/", "-") or "poc-dossier"
    object_name = f"business-needs/{safe_need_id}/exports/{timestamp}-{safe_filename}"

    client = get_minio_client()
    client.put_object(
        bucket_name=bucket_name,
        object_name=object_name,
        data=BytesIO(content),
        length=len(content),
        content_type=content_type,
    )
    return object_name
