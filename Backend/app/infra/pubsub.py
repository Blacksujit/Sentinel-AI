"""Pub/sub message queue (Redis-backed, in-process fallback).

Used for cross-instance fan-out: WebSocket broadcasts, alert notifications
posted from any replica reach every worker's connected clients.

Contract:
    await publish(channel, message)      - fire and forget
    await subscribe(channel, handler)    - handler called for every message
"""

import asyncio
import json
import logging
from typing import Any, Awaitable, Callable, Dict, List, Optional

from app.infra.config import channel_prefix, get_redis_url
from app.infra.redis import get_redis

logger = logging.getLogger(__name__)

PubHandler = Callable[[str, Dict[str, Any]], Awaitable[None]]

_in_process: Dict[str, List[PubHandler]] = {}
_pubsub_client: Optional[Any] = None
_subscriber_task: Optional[asyncio.Task] = None
_subscription_channels: List[str] = []


def _channel(name: str) -> str:
    if not name.startswith(channel_prefix()):
        return f"{channel_prefix()}:{name}"
    return name


async def publish(channel: str, message: Dict[str, Any]) -> None:
    """Publish a message. Delivers to local handlers immediately; remote
    instances receive it via Redis pub/sub when available."""
    name = _channel(channel)
    await _deliver_local(name, message)
    client = await get_redis()
    if client is None:
        return
    try:
        await client.publish(name, json.dumps(message, default=str))
    except Exception as exc:  # pragma: no cover
        logger.warning("Redis publish failed (local delivery already done): %s", exc)


async def _deliver_local(channel: str, message: Dict[str, Any]) -> None:
    for handler in list(_in_process.get(channel, [])):
        try:
            await handler(channel, message)
        except Exception:  # pragma: no cover - a handler must never kill the bus
            logger.exception("pubsub handler error on %s", channel)


async def subscribe(channel: str, handler: PubHandler) -> None:
    """Register a handler. Handler receives (channel, message) tuples."""
    name = _channel(channel)
    if name not in _in_process:
        _in_process[name] = []
    _in_process[name].append(handler)
    if name not in _subscription_channels:
        _subscription_channels.append(name)
    await _ensure_subscriber()


async def _ensure_subscriber() -> None:
    global _subscriber_task
    if _subscriber_task is not None and not _subscriber_task.done():
        return
    client = await get_redis()
    if client is None:
        return
    _subscriber_task = asyncio.create_task(_run_subscriber(client))


async def _run_subscriber(client) -> None:
    pubsub = client.pubsub()
    # Subscribe is async-safe with redis-py >= 5; setup on the current loop.
    try:
        if _subscription_channels:
            await pubsub.subscribe(*_subscription_channels)
        while True:
            message = await pubsub.get_message(ignore_subscribe_messages=True, timeout=1.0)
            if message and message.get("type") == "message":
                try:
                    payload = json.loads(message["data"])
                except (TypeError, ValueError):
                    payload = {"raw": str(message["data"])}
                await _deliver_local(message["channel"], payload)
            await asyncio.sleep(0)
    except asyncio.CancelledError:
        try:
            await pubsub.unsubscribe(*_subscription_channels)
            await pubsub.aclose()
        except Exception:  # pragma: no cover
            logger.debug("pubsub teardown error", exc_info=True)
        raise
    except Exception:  # pragma: no cover
        logger.warning("Pub/sub subscriber stopped unexpectedly", exc_info=True)


async def close_pubsub() -> None:
    global _subscriber_task
    if _subscriber_task is not None:
        _subscriber_task.cancel()
        try:
            await _subscriber_task
        except (asyncio.CancelledError, Exception):
            pass
        _subscriber_task = None


async def health() -> Dict[str, str]:
    from app.infra.redis import redis_available

    return {
        "available": str(redis_available()),
        "subscriptions": str(len(_in_process)),
    }