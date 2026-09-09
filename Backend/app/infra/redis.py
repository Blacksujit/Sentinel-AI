"""Lazy Redis client with fail-open behavior.

Returns a usable client when Redis is configured; otherwise returns None.
Callers must always guard against None (the whole app fails open if Redis
goes down - the job queue falls back to memory mode automatically).
"""

import asyncio
import logging
from typing import Optional

from app.infra.config import get_redis_url

logger = logging.getLogger(__name__)

_redis = None
_available = False
_lock = asyncio.Lock()


async def get_redis():
    """Return a shared async Redis client, or None if Redis is unavailable."""
    global _redis, _available
    if _available and _redis is not None:
        return _redis
    async with _lock:
        if _available and _redis is not None:
            return _redis
        url = get_redis_url()
        if not url:
            _available = False
            return None
        try:
            import redis.asyncio as aioredis

            client = aioredis.from_url(
                url,
                decode_responses=True,
                socket_connect_timeout=2,
                socket_timeout=3,
                health_check_interval=30,
            )
            await client.ping()
            _redis = client
            _available = True
            logger.info("Redis connected (queue/pubsub available)")
            return _redis
        except Exception as exc:  # pragma: no cover - depends on infra
            _redis = None
            _available = False
            logger.warning("Redis unavailable - failing open: %s", exc)
            return None


def redis_available() -> bool:
    return _available and _redis is not None


async def close_redis() -> None:
    global _redis, _available
    if _redis is not None:
        try:
            await _redis.aclose()
        except Exception:  # pragma: no cover
            logger.debug("Ignoring error closing Redis", exc_info=True)
    _redis = None
    _available = False