import os
import time
import logging
from typing import Optional

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response, JSONResponse

from app.middleware.auth import get_api_key_from_request

logger = logging.getLogger(__name__)

REDIS_URL = os.getenv("REDIS_URL", "")
RATE_LIMIT_ENABLED = os.getenv("RATE_LIMIT_ENABLED", "true").lower() == "true"

TIER_LIMITS = {
    "free": {"max_requests": 10, "window_seconds": 60},
    "pro": {"max_requests": 60, "window_seconds": 60},
    "team": {"max_requests": 300, "window_seconds": 60},
    "enterprise": {"max_requests": 1000, "window_seconds": 60},
}


class RedisRateLimiter:
    def __init__(self, redis_client=None):
        self._redis = redis_client

    @property
    def redis(self):
        if self._redis is None and REDIS_URL:
            try:
                import redis as _redis
                self._redis = _redis.from_url(REDIS_URL, socket_connect_timeout=2, socket_timeout=2)
                self._redis.ping()
                logger.info("Redis connected for rate limiting")
            except Exception as e:
                logger.warning("Redis unavailable for rate limiting — failing open: %s", e)
                self._redis = None
        return self._redis

    def check(self, key: str, max_requests: int, window_seconds: int) -> tuple[bool, int]:
        r = self.redis
        if r is None:
            return True, max_requests

        try:
            now = time.time()
            window_start = now - window_seconds
            pipe = r.pipeline()
            pipe.zremrangebyscore(key, 0, window_start)
            pipe.zcard(key)
            pipe.zadd(key, {str(now): now})
            pipe.expire(key, window_seconds)
            _, count, _, _ = pipe.execute()
            return count <= max_requests, max(0, max_requests - count)
        except Exception as e:
            logger.error("Rate limit check failed: %s", e)
            return True, max_requests

    def key_for_apikey(self, api_key_prefix: str, window: int) -> str:
        return f"ratelimit:apikey:{api_key_prefix}:{window}"

    def key_for_org(self, org_id: int, window: int) -> str:
        return f"ratelimit:org:{org_id}:{window}"

    def key_for_ip(self, ip: str, window: int) -> str:
        return f"ratelimit:ip:{ip}:{window}"


rate_limiter = RedisRateLimiter()


class RateLimitMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        if not RATE_LIMIT_ENABLED:
            return await call_next(request)

        skip_paths = ("/metrics", "/health", "/readiness", "/liveness", "/api/health")
        if request.url.path.startswith(skip_paths):
            return await call_next(request)

        api_key = get_api_key_from_request(request)
        plan_tier = "free"
        org_id = None

        if api_key:
            try:
                from app.storage.db import SessionLocal
                from app.services.api_key_service import verify_api_key_hash
                db = SessionLocal()
                try:
                    key_row = verify_api_key_hash(db, raw_key=api_key)
                    if key_row and key_row.org:
                        org_id = key_row.org_id
                        plan_tier = key_row.org.plan_tier.value
                finally:
                    db.close()
            except Exception as e:
                logger.debug("Could not resolve API key to org: %s", e)

        limits = TIER_LIMITS.get(plan_tier, TIER_LIMITS["free"])
        max_r = limits["max_requests"]
        window = limits["window_seconds"]

        if org_id:
            redis_key = rate_limiter.key_for_org(org_id, window)
        elif api_key:
            redis_key = rate_limiter.key_for_apikey(api_key[:12], window)
        else:
            client_ip = request.client.host if request.client else "unknown"
            redis_key = rate_limiter.key_for_ip(client_ip, window)
            max_r = 20
            window = 60

        allowed, remaining = rate_limiter.check(redis_key, max_r, window)
        now_ts = int(time.time())
        reset_time = now_ts + window

        response: Response = await call_next(request)
        response.headers["X-RateLimit-Limit"] = str(max_r)
        response.headers["X-RateLimit-Remaining"] = str(remaining)
        response.headers["X-RateLimit-Reset"] = str(reset_time)

        if not allowed:
            return JSONResponse(
                status_code=429,
                content={
                    "error": "rate_limit_exceeded",
                    "message": f"Rate limit of {max_r} requests per {window}s exceeded. Upgrade your plan for higher limits.",
                    "upgrade_url": "/billing",
                    "current_plan": plan_tier,
                },
                headers=dict(response.headers),
            )

        return response
