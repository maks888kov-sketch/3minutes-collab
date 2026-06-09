from fastapi import APIRouter, Depends, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.email_service import send_email
from app.errors import ApiError
from app.ice import build_ice_servers
from app.models import User
from app.otp import issue_code, verify_code
from app.security import hash_password

router = APIRouter(prefix="/api/apps/{app_id}/functions", tags=["functions"])

RESET_SUBJECT = "Код для сброса пароля — 3Minutes"


def _reset_body(code: str) -> str:
    return (
        f"Ваш код для сброса пароля в 3Minutes: {code}\n\n"
        f"Откройте приложение → «Забыли пароль?» → введите этот код и новый пароль.\n"
        f"Код действует 15 минут.\n\n"
        f"Если вы не запрашивали сброс пароля — просто проигнорируйте это письмо."
    )


async def _get_user(db: AsyncSession, email: str) -> User | None:
    result = await db.execute(select(User).where(User.email == email))
    return result.scalar_one_or_none()


@router.post("/{function_name}")
async def invoke_function(
    app_id: str,
    function_name: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    if function_name == "getIceServers":
        # Public: returns STUN/TURN config the browser feeds to RTCPeerConnection.
        # TURN credentials (when configured) are short-lived and minted per call.
        return {"iceServers": build_ice_servers()}

    payload = await request.json()

    if function_name == "requestPasswordResetCode":
        email = (payload.get("email") or "").strip().lower()
        if email:
            user = await _get_user(db, email)
            if user:
                code = await issue_code(db, email, "reset")
                await send_email(email, RESET_SUBJECT, _reset_body(code))
        # Never reveal whether the account exists.
        return {"message": "If account exists, code was sent"}

    if function_name == "resetPasswordWithCode":
        email = (payload.get("email") or "").strip().lower()
        code = (payload.get("code") or "").strip()
        new_password = payload.get("newPassword") or ""
        if len(new_password) < 6:
            raise ApiError(422, "Password is too short")
        ok = await verify_code(db, email, code, "reset")
        if not ok:
            raise ApiError(400, "Invalid or expired reset token")
        user = await _get_user(db, email)
        if not user:
            raise ApiError(400, "Invalid or expired reset token")
        user.password_hash = hash_password(new_password)
        user.is_verified = True
        await db.commit()
        return {"message": "Password updated"}

    raise ApiError(404, f"Backend function '{function_name}' not found or not deployed")
