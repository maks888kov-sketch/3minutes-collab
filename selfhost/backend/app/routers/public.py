from fastapi import APIRouter

router = APIRouter(prefix="/api/apps/public", tags=["public"])


@router.get("/prod/public-settings/by-id/{app_id}")
async def public_settings(app_id: str):
    # The frontend only needs this call to succeed (200) so it proceeds to auth.
    return {
        "id": app_id,
        "name": "3Minutes",
        "requires_auth": False,
        "is_public": True,
        "auth_required": False,
    }
