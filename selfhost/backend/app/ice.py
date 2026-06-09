"""ICE server list for WebRTC video calls.

Returns STUN servers (always) plus TURN relay servers when configured. When a
TURN shared secret is present we mint short-lived credentials using coturn's
"use-auth-secret" (TURN REST API) scheme, so the browser never receives a
long-lived password.
"""
import base64
import hashlib
import hmac
import time

from app.config import settings


def _split(csv: str) -> list[str]:
    return [item.strip() for item in (csv or "").split(",") if item.strip()]


def build_ice_servers() -> list[dict]:
    servers: list[dict] = []

    stun = _split(settings.stun_urls)
    if stun:
        servers.append({"urls": stun})

    turn = _split(settings.turn_urls)
    if turn:
        if settings.turn_secret:
            # Ephemeral credential valid for turn_ttl_seconds.
            expiry = int(time.time()) + max(60, settings.turn_ttl_seconds)
            username = str(expiry)
            digest = hmac.new(
                settings.turn_secret.encode("utf-8"),
                username.encode("utf-8"),
                hashlib.sha1,
            ).digest()
            credential = base64.b64encode(digest).decode("utf-8")
            servers.append({
                "urls": turn,
                "username": username,
                "credential": credential,
            })
        elif settings.turn_static_username and settings.turn_static_credential:
            servers.append({
                "urls": turn,
                "username": settings.turn_static_username,
                "credential": settings.turn_static_credential,
            })

    return servers
