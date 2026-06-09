from fastapi import APIRouter, Depends, File, UploadFile

from app.deps import get_current_user
from app.errors import ApiError
from app.models import User
from app.storage import put_file

router = APIRouter(prefix="/api/apps/{app_id}/integration-endpoints", tags=["integrations"])

MAX_SIZE = 10 * 1024 * 1024  # 10 MB


@router.post("/Core/UploadFile")
async def upload_file(
    app_id: str,
    file: UploadFile = File(...),
    user: User = Depends(get_current_user),
):
    data = await file.read()
    if len(data) > MAX_SIZE:
        raise ApiError(413, "File too large")
    file_url = put_file(data, file.content_type or "application/octet-stream", file.filename or "upload")
    return {"file_url": file_url, "url": file_url}
