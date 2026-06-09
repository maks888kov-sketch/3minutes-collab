import json

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from sqlalchemy import select

from app.database import SessionLocal
from app.models import Profile
from app.realtime import hub
from app.security import decode_access_token

router = APIRouter(tags=["ws"])

# Signal kinds the server is willing to relay between the two peers of a call.
_SIGNAL_KINDS = {
    "call-invite", "call-cancel", "call-accept", "call-reject",
    "call-end", "call-busy", "offer", "answer", "ice", "ready",
}


async def _profile_email(profile_id: str) -> str | None:
    """Return the owner email of a profile (None if it doesn't exist)."""
    async with SessionLocal() as db:
        result = await db.execute(select(Profile).where(Profile.id == profile_id))
        profile = result.scalar_one_or_none()
        return profile.created_by if profile else None


@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    # Entity events are non-sensitive (they only tell the client to refetch), so
    # every socket is accepted. Call signaling, however, is addressed: a socket
    # must first prove (via the JWT it connected with) that it owns the profile
    # it claims, after which it can send/receive WebRTC signaling for that profile.
    await websocket.accept()
    await hub.register(websocket)

    token = websocket.query_params.get("token")
    payload = decode_access_token(token) if token else None
    user_email = (payload or {}).get("email")
    bound_profile: str | None = None

    try:
        while True:
            raw = await websocket.receive_text()
            try:
                msg = json.loads(raw)
            except (TypeError, ValueError):
                continue
            if not isinstance(msg, dict):
                continue

            kind = msg.get("type")

            # Identify which profile this socket speaks for.
            if kind == "hello":
                profile_id = msg.get("profile_id")
                if not profile_id or not user_email:
                    continue
                owner = await _profile_email(profile_id)
                if owner and owner == user_email:
                    bound_profile = profile_id
                    await hub.bind_profile(websocket, profile_id)
                continue

            # Relay a call-signaling message to the recipient profile.
            if kind == "signal":
                if not bound_profile:
                    continue
                to_profile_id = msg.get("to_profile_id")
                signal_kind = msg.get("signal")
                if not to_profile_id or signal_kind not in _SIGNAL_KINDS:
                    continue
                await hub.publish_signal({
                    "type": "signal",
                    "signal": signal_kind,
                    "to_profile_id": to_profile_id,
                    "from_profile_id": bound_profile,
                    "match_id": msg.get("match_id"),
                    "data": msg.get("data"),
                })
                continue
            # Unknown message types are ignored (keeps the socket alive).
    except WebSocketDisconnect:
        pass
    except Exception:
        pass
    finally:
        await hub.unregister(websocket)
