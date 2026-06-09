import io
import mimetypes
import os
import re
import uuid

from minio import Minio

from app.config import settings

_KEY_RE = re.compile(r"^[A-Za-z0-9._-]+$")


def _ext(filename: str | None) -> str:
    if filename and "." in filename:
        return "." + filename.rsplit(".", 1)[-1].lower()
    return ""


def _is_minio() -> bool:
    return settings.storage_backend.lower() == "minio"


# --------------------------- local (disk) backend --------------------------- #

def _local_dir() -> str:
    os.makedirs(settings.local_storage_dir, exist_ok=True)
    return settings.local_storage_dir


def _local_put(data: bytes, content_type: str, filename: str) -> str:
    key = f"{uuid.uuid4().hex}{_ext(filename)}"
    path = os.path.join(_local_dir(), key)
    with open(path, "wb") as f:
        f.write(data)
    # Remember the content type in a sidecar so we can serve it back correctly.
    with open(path + ".ct", "w", encoding="utf-8") as f:
        f.write(content_type or "application/octet-stream")
    return key


def _local_get(key: str):
    path = os.path.join(_local_dir(), key)
    if not os.path.isfile(path):
        raise FileNotFoundError(key)
    with open(path, "rb") as f:
        data = f.read()
    content_type = "application/octet-stream"
    ct_path = path + ".ct"
    if os.path.isfile(ct_path):
        with open(ct_path, encoding="utf-8") as f:
            content_type = f.read().strip() or content_type
    else:
        guessed, _ = mimetypes.guess_type(key)
        content_type = guessed or content_type
    return data, content_type


# ------------------------------ minio backend ------------------------------ #

_client: Minio | None = None


def _minio() -> Minio:
    global _client
    if _client is None:
        _client = Minio(
            settings.minio_endpoint,
            access_key=settings.minio_access_key,
            secret_key=settings.minio_secret_key,
            secure=settings.minio_secure,
        )
    return _client


def _minio_ensure() -> None:
    client = _minio()
    if not client.bucket_exists(settings.minio_bucket):
        client.make_bucket(settings.minio_bucket)


def _minio_put(data: bytes, content_type: str, filename: str) -> str:
    try:
        _minio_ensure()
    except Exception:
        pass
    key = f"{uuid.uuid4().hex}{_ext(filename)}"
    _minio().put_object(
        settings.minio_bucket,
        key,
        io.BytesIO(data),
        length=len(data),
        content_type=content_type or "application/octet-stream",
    )
    return key


def _minio_get(key: str):
    resp = _minio().get_object(settings.minio_bucket, key)
    try:
        data = resp.read()
        content_type = resp.headers.get("Content-Type", "application/octet-stream")
        return data, content_type
    finally:
        resp.close()
        resp.release_conn()


# -------------------------------- dispatch --------------------------------- #

def ensure_storage() -> None:
    """Prepare the active backend (create bucket / directory)."""
    if _is_minio():
        _minio_ensure()
    else:
        _local_dir()


def put_file(data: bytes, content_type: str, filename: str) -> str:
    """Store bytes and return a same-origin URL the browser can load."""
    if _is_minio():
        key = _minio_put(data, content_type, filename)
    else:
        key = _local_put(data, content_type, filename)
    return f"{settings.public_file_base}/{key}"


def get_file(key: str):
    """Return (bytes, content_type) for a stored object."""
    if not _KEY_RE.match(key or ""):
        raise FileNotFoundError(key)
    if _is_minio():
        return _minio_get(key)
    return _local_get(key)
