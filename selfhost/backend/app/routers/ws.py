import asyncio
import contextlib

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.realtime import hub

router = APIRouter(tags=["ws"])


@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    # Token is accepted via query string but realtime events are non-sensitive
    # (they only tell the client to refetch), so we accept all connections.
    await websocket.accept()
    await hub.register(websocket)
    try:
        while True:
            # Keep the socket alive; ignore inbound payloads (client only listens).
            with contextlib.suppress(asyncio.TimeoutError):
                await asyncio.wait_for(websocket.receive_text(), timeout=30)
    except WebSocketDisconnect:
        pass
    except Exception:
        pass
    finally:
        await hub.unregister(websocket)
