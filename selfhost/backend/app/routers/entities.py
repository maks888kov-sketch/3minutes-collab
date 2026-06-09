import json
from datetime import datetime

from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy import DateTime, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.deps import get_current_user
from app.entity_registry import REALTIME_ENTITIES, get_model
from app.errors import ApiError
from app.models import User
from app.realtime import emit_entity_event
from app.serializers import serialize, serialize_user

router = APIRouter(prefix="/api/apps/{app_id}/entities", tags=["entities"])


# --- auth.me() : GET /entities/User/me (must be declared before generic routes) ---
@router.get("/User/me")
async def get_me(app_id: str, user: User = Depends(get_current_user)):
    return serialize_user(user)


def _coerce_value(model, key: str, value):
    """Convert incoming JSON values to what the column expects (e.g. ISO->datetime)."""
    column = model.__table__.columns.get(key)
    if column is None:
        return value
    if isinstance(column.type, DateTime) and isinstance(value, str):
        try:
            return datetime.fromisoformat(value.replace("Z", "+00:00"))
        except ValueError:
            return value
    return value


def _apply_writable(model, obj, data: dict):
    columns = model.__table__.columns
    protected = {"id", "created_date", "updated_date"}
    for key, value in data.items():
        if key in columns and key not in protected:
            setattr(obj, key, _coerce_value(model, key, value))


@router.get("/{entity}")
async def list_entities(
    app_id: str,
    entity: str,
    q: str | None = Query(default=None),
    sort: str | None = Query(default=None),
    limit: int | None = Query(default=None),
    skip: int | None = Query(default=None),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    model = get_model(entity)
    if model is None:
        raise ApiError(404, f"Unknown entity '{entity}'")

    stmt = select(model)

    if q:
        try:
            query = json.loads(q)
        except json.JSONDecodeError:
            query = {}
        for key, value in (query or {}).items():
            column = model.__table__.columns.get(key)
            if column is not None:
                stmt = stmt.where(getattr(model, key) == _coerce_value(model, key, value))

    # Sorting: 'field' asc, '-field' desc.
    order_col = None
    descending = False
    if sort:
        field = sort
        if field.startswith("-"):
            descending = True
            field = field[1:]
        if field in model.__table__.columns:
            order_col = getattr(model, field)
    if order_col is None:
        order_col = model.created_date
    stmt = stmt.order_by(order_col.desc() if descending else order_col.asc())

    if skip:
        stmt = stmt.offset(skip)
    if limit:
        stmt = stmt.limit(limit)

    result = await db.execute(stmt)
    return [serialize(row) for row in result.scalars().all()]


@router.get("/{entity}/{item_id}")
async def get_entity(
    app_id: str,
    entity: str,
    item_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    model = get_model(entity)
    if model is None:
        raise ApiError(404, f"Unknown entity '{entity}'")
    result = await db.execute(select(model).where(model.id == item_id))
    obj = result.scalar_one_or_none()
    if obj is None:
        raise ApiError(404, "Not found", code="NOT_FOUND")
    return serialize(obj)


@router.post("/{entity}")
async def create_entity(
    app_id: str,
    entity: str,
    request: Request,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    model = get_model(entity)
    if model is None:
        raise ApiError(404, f"Unknown entity '{entity}'")
    data = await request.json()
    obj = model()
    _apply_writable(model, obj, data)
    obj.created_by = user.email
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    serialized = serialize(obj)
    if entity in REALTIME_ENTITIES:
        await emit_entity_event(entity, "create", serialized)
    return serialized


@router.put("/{entity}/{item_id}")
async def update_entity(
    app_id: str,
    entity: str,
    item_id: str,
    request: Request,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    model = get_model(entity)
    if model is None:
        raise ApiError(404, f"Unknown entity '{entity}'")
    result = await db.execute(select(model).where(model.id == item_id))
    obj = result.scalar_one_or_none()
    if obj is None:
        raise ApiError(404, "Not found", code="NOT_FOUND")
    data = await request.json()
    _apply_writable(model, obj, data)
    await db.commit()
    await db.refresh(obj)
    serialized = serialize(obj)
    if entity in REALTIME_ENTITIES:
        await emit_entity_event(entity, "update", serialized)
    return serialized


@router.delete("/{entity}/{item_id}")
async def delete_entity(
    app_id: str,
    entity: str,
    item_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    model = get_model(entity)
    if model is None:
        raise ApiError(404, f"Unknown entity '{entity}'")
    result = await db.execute(select(model).where(model.id == item_id))
    obj = result.scalar_one_or_none()
    if obj is None:
        return {"success": True}
    await db.delete(obj)
    await db.commit()
    return {"success": True}
