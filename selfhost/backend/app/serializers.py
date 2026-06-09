from datetime import datetime

from sqlalchemy import inspect


def _iso(value: datetime) -> str:
    # Always emit a UTC ISO string the JS `new Date(...)` parser accepts.
    if value.tzinfo is None:
        return value.isoformat() + "Z"
    return value.isoformat()


def serialize(obj) -> dict:
    """Dump a SQLAlchemy model instance into a plain JSON-able dict,
    matching the field names the frontend reads (id, created_date, ...)."""
    if obj is None:
        return None
    data = {}
    for column in inspect(obj).mapper.column_attrs:
        key = column.key
        value = getattr(obj, key)
        if isinstance(value, datetime):
            value = _iso(value)
        data[key] = value
    return data


def serialize_user(user) -> dict:
    """Public shape for the authenticated user (no password hash)."""
    return {
        "id": user.id,
        "email": user.email,
        "full_name": user.full_name,
        "name": user.name or user.full_name,
        "is_verified": user.is_verified,
        "created_date": _iso(user.created_date) if user.created_date else None,
        "updated_date": _iso(user.updated_date) if user.updated_date else None,
    }
