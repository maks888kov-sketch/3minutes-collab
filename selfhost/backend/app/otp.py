import secrets
from datetime import datetime, timedelta, timezone

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models import OtpCode


def generate_code() -> str:
    return f"{secrets.randbelow(900000) + 100000}"


async def issue_code(db: AsyncSession, email: str, purpose: str) -> str:
    # Invalidate any previous unused codes for this email+purpose.
    await db.execute(
        update(OtpCode)
        .where(OtpCode.email == email, OtpCode.purpose == purpose, OtpCode.used.is_(False))
        .values(used=True)
    )
    code = generate_code()
    expires = datetime.now(timezone.utc) + timedelta(minutes=settings.otp_ttl_minutes)
    db.add(OtpCode(email=email, code=code, purpose=purpose, expires_at=expires, used=False))
    await db.commit()
    return code


async def verify_code(db: AsyncSession, email: str, code: str, purpose: str) -> bool:
    result = await db.execute(
        select(OtpCode)
        .where(
            OtpCode.email == email,
            OtpCode.purpose == purpose,
            OtpCode.used.is_(False),
        )
        .order_by(OtpCode.created_date.desc())
    )
    records = result.scalars().all()
    now = datetime.now(timezone.utc)
    for record in records:
        expires = record.expires_at
        if expires.tzinfo is None:
            expires = expires.replace(tzinfo=timezone.utc)
        if record.code == code.strip() and expires > now:
            record.used = True
            await db.commit()
            return True
    return False
