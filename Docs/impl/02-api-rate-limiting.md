# 02 - API Rate Limiting per Key

## Objective
Replace the current single-process in-memory rate limiter (100 req/min/IP) with a Redis-based sliding window that enforces per-API-key and per-org limits based on `plan_tier`.

## Plan Limits

| Tier | Rate (req/min) | Monthly Cap | Enforcement |
|------|---------------|-------------|-------------|
| Free | 10 req/min | 1,000/month | Hard block |
| Pro | 60 req/min | 50,000/month | Hard block |
| Team | 300 req/min | 500,000/month | Soft warn + hard block |
| Enterprise | 1,000 req/min | Unlimited | Soft warn only |

## Files to Create/Modify

### New Files
| File | Purpose |
|------|---------|
| `Backend/app/middleware/rate_limiter.py` | Redis sliding window rate limiter class |

### Modified Files
| File | Change |
|------|--------|
| `Backend/main.py` | Replace in-memory `RateLimitMiddleware` with Redis-based version |
| `Backend/.env.example` | Add `REDIS_URL`, `RATE_LIMIT_ENABLED` |
| `Backend/api/requirements.txt` | Add `redis>=5.0.0` |

## Implementation

### Redis Sliding Window Rate Limiter
```python
class RedisRateLimiter:
    def __init__(self, redis_client, max_requests: int, window_seconds: int):
        self.redis = redis_client
        self.max_requests = max_requests
        self.window = window_seconds

    def check(self, key: str) -> tuple[bool, int]:
        """Returns (allowed: bool, remaining: int)"""
        now = time.time()
        window_start = now - self.window
        pipe = self.redis.pipeline()
        pipe.zremrangebyscore(key, 0, window_start)
        pipe.zcard(key)
        pipe.zadd(key, {str(now): now})
        pipe.expire(key, self.window)
        _, count, _, _ = pipe.execute()
        return count <= self.max_requests, max(0, self.max_requests - count)
```

### Key Strategy
- Per API key: `ratelimit:apikey:{prefix}:{window}`
- Per org: `ratelimit:org:{org_id}:{window}`
- Per IP (fallback if no key): `ratelimit:ip:{ip}:{window}`

### Middleware Flow
1. Extract API key from request header
2. Look up org from API key
3. Determine plan_tier limits
4. Check Redis sliding window
5. If exceeded: return 429 with `X-RateLimit-Remaining: 0` + `X-RateLimit-Reset` headers
6. Always add rate limit headers to response

### Migration Notes
- Current in-memory limiter is per-process and incompatible with multi-worker deployments
- Redis makes rate limiting consistent across all workers
- Fallback: if Redis unavailable, degrade to allow (fail open) but log warning
