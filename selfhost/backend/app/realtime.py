import asyncio
import json
import contextlib

import redis.asyncio as aioredis
from fastapi import WebSocket

from app.config import settings

CHANNEL = "threemin:events"


class RealtimeHub:
    """Fan-out hub. Events are published to Redis so the system scales across
    multiple backend instances; each instance relays them to its local
    WebSocket clients, which trigger React Query cache invalidation."""

    def __init__(self) -> None:
        self._clients: set[WebSocket] = set()
        self._redis: aioredis.Redis | None = None
        self._pubsub_task: asyncio.Task | None = None
        self._lock = asyncio.Lock()

    async def start(self) -> None:
        self._redis = aioredis.from_url(settings.redis_url, decode_responses=True)
        self._pubsub_task = asyncio.create_task(self._listen())

    async def stop(self) -> None:
        if self._pubsub_task:
            self._pubsub_task.cancel()
            with contextlib.suppress(asyncio.CancelledError):
                await self._pubsub_task
        if self._redis:
            await self._redis.aclose()

    async def _listen(self) -> None:
        assert self._redis is not None
        pubsub = self._redis.pubsub()
        await pubsub.subscribe(CHANNEL)
        try:
            async for message in pubsub.listen():
                if message.get("type") != "message":
                    continue
                await self._fan_out(message["data"])
        except asyncio.CancelledError:
            raise
        finally:
            with contextlib.suppress(Exception):
                await pubsub.unsubscribe(CHANNEL)
                await pubsub.aclose()

    async def _fan_out(self, payload: str) -> None:
        dead: list[WebSocket] = []
        for ws in list(self._clients):
            try:
                await ws.send_text(payload)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self._clients.discard(ws)

    async def register(self, ws: WebSocket) -> None:
        async with self._lock:
            self._clients.add(ws)

    async def unregister(self, ws: WebSocket) -> None:
        async with self._lock:
            self._clients.discard(ws)

    async def publish(self, event: dict) -> None:
        if self._redis is None:
            return
        with contextlib.suppress(Exception):
            await self._redis.publish(CHANNEL, json.dumps(event))


hub = RealtimeHub()


async def emit_entity_event(entity: str, action: str, data: dict) -> None:
    """Notify clients that an entity changed so they can refetch."""
    event = {
        "type": "entity",
        "entity": entity,
        "action": action,
        "match_id": data.get("match_id") or data.get("id"),
        "profile_a_id": data.get("profile_a_id"),
        "profile_b_id": data.get("profile_b_id"),
    }
    await hub.publish(event)
