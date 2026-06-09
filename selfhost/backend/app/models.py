import uuid
from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


def new_id() -> str:
    # 24-char hex id, mirrors Base44 / Mongo ObjectId-style identifiers
    return uuid.uuid4().hex[:24]


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class TimestampMixin:
    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=new_id)
    created_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_date: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, onupdate=utcnow
    )
    created_by: Mapped[str | None] = mapped_column(String(320), nullable=True)


class User(TimestampMixin, Base):
    __tablename__ = "users"

    email: Mapped[str] = mapped_column(String(320), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    full_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False)


class Profile(TimestampMixin, Base):
    __tablename__ = "profiles"

    telegram_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    age: Mapped[int | None] = mapped_column(Integer, nullable=True)
    city: Mapped[str | None] = mapped_column(String(255), nullable=True)
    bio: Mapped[str | None] = mapped_column(Text, nullable=True)
    photos: Mapped[list] = mapped_column(JSONB, default=list)
    interests: Mapped[list] = mapped_column(JSONB, default=list)
    goal: Mapped[str | None] = mapped_column(String(32), nullable=True)
    gender: Mapped[str | None] = mapped_column(String(16), nullable=True)
    looking_for: Mapped[str | None] = mapped_column(String(16), nullable=True)
    is_online: Mapped[bool] = mapped_column(Boolean, default=False)
    last_seen: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    is_premium: Mapped[bool] = mapped_column(Boolean, default=False)
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False)
    profile_complete: Mapped[bool] = mapped_column(Boolean, default=False)
    min_age_filter: Mapped[int] = mapped_column(Integer, default=18)
    max_age_filter: Mapped[int] = mapped_column(Integer, default=45)
    city_filter: Mapped[str] = mapped_column(String(255), default="")
    blocked_profile_ids: Mapped[list] = mapped_column(JSONB, default=list)
    photo_slides: Mapped[list] = mapped_column(JSONB, default=list)


class Match(TimestampMixin, Base):
    __tablename__ = "matches"

    profile_a_id: Mapped[str] = mapped_column(String(32), index=True)
    profile_b_id: Mapped[str] = mapped_column(String(32), index=True)
    status: Mapped[str] = mapped_column(String(32), default="active")
    video_consent_a: Mapped[bool] = mapped_column(Boolean, default=False)
    video_consent_b: Mapped[bool] = mapped_column(Boolean, default=False)
    video_result_a: Mapped[str] = mapped_column(String(16), default="pending")
    video_result_b: Mapped[str] = mapped_column(String(16), default="pending")
    last_message_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    last_message_time: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    unread_count_a: Mapped[int] = mapped_column(Integer, default=0)
    unread_count_b: Mapped[int] = mapped_column(Integer, default=0)


class Message(TimestampMixin, Base):
    __tablename__ = "messages"

    match_id: Mapped[str] = mapped_column(String(32), index=True)
    sender_profile_id: Mapped[str] = mapped_column(String(32), index=True)
    type: Mapped[str] = mapped_column(String(16), default="text")
    content: Mapped[str | None] = mapped_column(Text, nullable=True)
    reaction: Mapped[str | None] = mapped_column(String(32), nullable=True)
    is_read: Mapped[bool] = mapped_column(Boolean, default=False)


class Like(TimestampMixin, Base):
    __tablename__ = "likes"

    from_profile_id: Mapped[str] = mapped_column(String(32), index=True)
    to_profile_id: Mapped[str] = mapped_column(String(32), index=True)
    is_like: Mapped[bool] = mapped_column(Boolean, default=True)
    is_super_like: Mapped[bool] = mapped_column(Boolean, default=False)


class Feedback(TimestampMixin, Base):
    __tablename__ = "feedback"

    title: Mapped[str | None] = mapped_column(String(255), nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    category: Mapped[str] = mapped_column(String(32), default="feature")
    status: Mapped[str] = mapped_column(String(32), default="new")
    votes: Mapped[int] = mapped_column(Integer, default=0)
    voter_ids: Mapped[list] = mapped_column(JSONB, default=list)
    author_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    admin_reply: Mapped[str | None] = mapped_column(Text, nullable=True)
    screenshot_url: Mapped[str | None] = mapped_column(Text, nullable=True)


class OtpCode(TimestampMixin, Base):
    __tablename__ = "otp_codes"

    email: Mapped[str] = mapped_column(String(320), index=True)
    code: Mapped[str] = mapped_column(String(8))
    purpose: Mapped[str] = mapped_column(String(16), default="verify")  # verify | reset
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    used: Mapped[bool] = mapped_column(Boolean, default=False)
