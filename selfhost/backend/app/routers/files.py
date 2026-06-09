from fastapi import APIRouter, Response

from app.errors import ApiError
from app.storage import get_file

router = APIRouter(prefix="/api/files", tags=["files"])


@router.get("/{key}")
async def serve_file(key: str):
    try:
        data, content_type = get_file(key)
    except Exception:
        raise ApiError(404, "File not found")
    return Response(
        content=data,
        media_type=content_type,
        headers={"Cache-Control": "public, max-age=31536000"},
    )
