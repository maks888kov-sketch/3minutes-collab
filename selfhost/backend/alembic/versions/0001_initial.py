"""initial schema

Revision ID: 0001_initial
Revises:
Create Date: 2026-06-02
"""
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

from alembic import op

revision = "0001_initial"
down_revision = None
branch_labels = None
depends_on = None


def _base_columns():
    """Fresh copies of the shared columns for each table."""
    return [
        sa.Column("id", sa.String(length=32), primary_key=True),
        sa.Column("created_date", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_date", sa.DateTime(timezone=True), nullable=False),
        sa.Column("created_by", sa.String(length=320), nullable=True),
    ]


def upgrade() -> None:
    op.create_table(
        "users",
        *_base_columns(),
        sa.Column("email", sa.String(length=320), nullable=False),
        sa.Column("password_hash", sa.String(length=255), nullable=False),
        sa.Column("full_name", sa.String(length=255), nullable=True),
        sa.Column("name", sa.String(length=255), nullable=True),
        sa.Column("is_verified", sa.Boolean(), server_default=sa.text("false"), nullable=False),
    )
    op.create_index("ix_users_email", "users", ["email"], unique=True)

    op.create_table(
        "profiles",
        *_base_columns(),
        sa.Column("telegram_id", sa.String(length=64), nullable=True),
        sa.Column("name", sa.String(length=255), nullable=True),
        sa.Column("age", sa.Integer(), nullable=True),
        sa.Column("city", sa.String(length=255), nullable=True),
        sa.Column("bio", sa.Text(), nullable=True),
        sa.Column("photos", JSONB(), nullable=True),
        sa.Column("interests", JSONB(), nullable=True),
        sa.Column("goal", sa.String(length=32), nullable=True),
        sa.Column("gender", sa.String(length=16), nullable=True),
        sa.Column("looking_for", sa.String(length=16), nullable=True),
        sa.Column("is_online", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.Column("last_seen", sa.DateTime(timezone=True), nullable=True),
        sa.Column("is_premium", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.Column("is_verified", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.Column("profile_complete", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.Column("min_age_filter", sa.Integer(), server_default=sa.text("18"), nullable=False),
        sa.Column("max_age_filter", sa.Integer(), server_default=sa.text("45"), nullable=False),
        sa.Column("city_filter", sa.String(length=255), server_default=sa.text("''"), nullable=False),
        sa.Column("blocked_profile_ids", JSONB(), nullable=True),
        sa.Column("photo_slides", JSONB(), nullable=True),
    )
    op.create_index("ix_profiles_created_by", "profiles", ["created_by"])

    op.create_table(
        "matches",
        *_base_columns(),
        sa.Column("profile_a_id", sa.String(length=32), nullable=False),
        sa.Column("profile_b_id", sa.String(length=32), nullable=False),
        sa.Column("status", sa.String(length=32), server_default=sa.text("'active'"), nullable=False),
        sa.Column("video_consent_a", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.Column("video_consent_b", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.Column("video_result_a", sa.String(length=16), server_default=sa.text("'pending'"), nullable=False),
        sa.Column("video_result_b", sa.String(length=16), server_default=sa.text("'pending'"), nullable=False),
        sa.Column("last_message_text", sa.Text(), nullable=True),
        sa.Column("last_message_time", sa.DateTime(timezone=True), nullable=True),
        sa.Column("unread_count_a", sa.Integer(), server_default=sa.text("0"), nullable=False),
        sa.Column("unread_count_b", sa.Integer(), server_default=sa.text("0"), nullable=False),
    )
    op.create_index("ix_matches_profile_a_id", "matches", ["profile_a_id"])
    op.create_index("ix_matches_profile_b_id", "matches", ["profile_b_id"])

    op.create_table(
        "messages",
        *_base_columns(),
        sa.Column("match_id", sa.String(length=32), nullable=False),
        sa.Column("sender_profile_id", sa.String(length=32), nullable=False),
        sa.Column("type", sa.String(length=16), server_default=sa.text("'text'"), nullable=False),
        sa.Column("content", sa.Text(), nullable=True),
        sa.Column("reaction", sa.String(length=32), nullable=True),
        sa.Column("is_read", sa.Boolean(), server_default=sa.text("false"), nullable=False),
    )
    op.create_index("ix_messages_match_id", "messages", ["match_id"])
    op.create_index("ix_messages_sender_profile_id", "messages", ["sender_profile_id"])

    op.create_table(
        "likes",
        *_base_columns(),
        sa.Column("from_profile_id", sa.String(length=32), nullable=False),
        sa.Column("to_profile_id", sa.String(length=32), nullable=False),
        sa.Column("is_like", sa.Boolean(), server_default=sa.text("true"), nullable=False),
        sa.Column("is_super_like", sa.Boolean(), server_default=sa.text("false"), nullable=False),
    )
    op.create_index("ix_likes_from_profile_id", "likes", ["from_profile_id"])
    op.create_index("ix_likes_to_profile_id", "likes", ["to_profile_id"])

    op.create_table(
        "feedback",
        *_base_columns(),
        sa.Column("title", sa.String(length=255), nullable=True),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("category", sa.String(length=32), server_default=sa.text("'feature'"), nullable=False),
        sa.Column("status", sa.String(length=32), server_default=sa.text("'new'"), nullable=False),
        sa.Column("votes", sa.Integer(), server_default=sa.text("0"), nullable=False),
        sa.Column("voter_ids", JSONB(), nullable=True),
        sa.Column("author_name", sa.String(length=255), nullable=True),
        sa.Column("admin_reply", sa.Text(), nullable=True),
        sa.Column("screenshot_url", sa.Text(), nullable=True),
    )

    op.create_table(
        "otp_codes",
        *_base_columns(),
        sa.Column("email", sa.String(length=320), nullable=False),
        sa.Column("code", sa.String(length=8), nullable=False),
        sa.Column("purpose", sa.String(length=16), server_default=sa.text("'verify'"), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("used", sa.Boolean(), server_default=sa.text("false"), nullable=False),
    )
    op.create_index("ix_otp_codes_email", "otp_codes", ["email"])


def downgrade() -> None:
    op.drop_table("otp_codes")
    op.drop_table("feedback")
    op.drop_table("likes")
    op.drop_table("messages")
    op.drop_table("matches")
    op.drop_table("profiles")
    op.drop_index("ix_users_email", table_name="users")
    op.drop_table("users")
