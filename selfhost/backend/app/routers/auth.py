from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.email_service import send_email
from app.errors import ApiError
from app.models import User
from app.otp import issue_code, verify_code
from app.schemas import LoginIn, RegisterIn, ResendOtpIn, VerifyOtpIn
from app.security import create_access_token, hash_password, verify_password
from app.serializers import serialize_user

router = APIRouter(prefix="/api/apps/{app_id}/auth", tags=["auth"])

VERIFY_SUBJECT = "Подтверждение email — 3Minutes"


def _verify_body(code: str) -> str:
    return (
        f"Ваш код подтверждения email в 3Minutes: {code}\n\n"
        f"Введите его на экране подтверждения. Код действует 15 минут.\n"
        f"Если вы не регистрировались — просто проигнорируйте это письмо."
    )


async def _get_user(db: AsyncSession, email: str) -> User | None:
    result = await db.execute(select(User).where(User.email == email))
    return result.scalar_one_or_none()


@router.post("/register")
async def register(app_id: str, body: RegisterIn, db: AsyncSession = Depends(get_db)):
    email = body.email.strip().lower()
    if len(body.password) < 6:
        raise ApiError(422, "Password is too short")

    existing = await _get_user(db, email)
    if existing and existing.is_verified:
        raise ApiError(409, "Email already registered")

    if existing and not existing.is_verified:
        existing.password_hash = hash_password(body.password)
        await db.commit()
        user = existing
    else:
        user = User(email=email, password_hash=hash_password(body.password), is_verified=False)
        db.add(user)
        await db.commit()

    code = await issue_code(db, email, "verify")
    await send_email(email, VERIFY_SUBJECT, _verify_body(code))
    return {"message": "Registration successful. Please check your email for the verification code."}


@router.post("/verify-otp")
async def verify_otp(app_id: str, body: VerifyOtpIn, db: AsyncSession = Depends(get_db)):
    email = body.email.strip().lower()
    user = await _get_user(db, email)
    if not user:
        raise ApiError(400, "Invalid or expired OTP code")

    ok = await verify_code(db, email, body.otp_code, "verify")
    if not ok:
        raise ApiError(400, "Invalid or expired OTP code")

    user.is_verified = True
    await db.commit()
    await db.refresh(user)
    return serialize_user(user)


@router.post("/resend-otp")
async def resend_otp(app_id: str, body: ResendOtpIn, db: AsyncSession = Depends(get_db)):
    email = body.email.strip().lower()
    user = await _get_user(db, email)
    if user and not user.is_verified:
        code = await issue_code(db, email, "verify")
        await send_email(email, VERIFY_SUBJECT, _verify_body(code))
    return {"message": "New verification code sent to your email."}


@router.post("/login")
async def login(app_id: str, body: LoginIn, db: AsyncSession = Depends(get_db)):
    email = body.email.strip().lower()
    user = await _get_user(db, email)
    if not user or not verify_password(body.password, user.password_hash):
        raise ApiError(401, "Invalid email or password")
    if not user.is_verified:
        raise ApiError(
            403,
            "Please verify your email before logging in. Check your email for the verification code.",
        )
    token = create_access_token(user.id, user.email)
    return {"access_token": token, "user": serialize_user(user)}


@router.post("/logout")
async def logout(app_id: str):
    # Stateless JWT — the client just drops the token.
    return {"success": True}
