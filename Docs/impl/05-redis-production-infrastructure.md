# 05 - Redis Production Infrastructure

## Objective
Add Redis for distributed rate limiting, caching, and background job processing.

## Files to Create/Modify

### New Files
| File | Purpose |
|------|---------|
| `Backend/app/core/redis.py` | Redis client singleton + connection pool |
| `Backend/app/core/cache.py` | Cache-aside helper functions |
| `Backend/app/core/background.py` | Background job queue (RQ-based) |

### Modified Files
| File | Change |
|------|--------|
| `Backend/main.py` | Initialize Redis on startup |
| `Backend/.env.example` | Add `REDIS_URL` |
| `Backend/api/requirements.txt` | Add `redis>=5.0.0`, `rq>=1.16.0` |

## Implementation

### Redis Client
```python
import redis.asyncio as aioredis

redis_pool: Optional[aioredis.ConnectionPool] = None

async def get_redis() -> aioredis.Redis:
    global redis_pool
    if redis_pool is None:
        redis_pool = aioredis.ConnectionPool.from_url(
            settings.REDIS_URL,
            max_connections=20,
            decode_responses=True
        )
    return aioredis.Redis(connection_pool=redis_pool)
```

### Caching Layer
```python
async def cache_get(key: str) -> Optional[str]: ...
async def cache_set(key: str, value: str, ttl: int = 300): ...
async def cache_delete(key: str): ...
async def cache_delete_pattern(pattern: str): ...
```

### Background Jobs (RQ)
- Invoicing jobs (monthly overage billing)
- Usage report generation
- Email notifications (welcome, plan change, overage warnings)
- Data retention/cleanup tasks

### Rate Limiting
Replace the in-memory `RateLimitMiddleware` with Redis-powered version (see `02-api-rate-limiting.md`).

## Migration
Redis will be deployed as a managed service (Render Redis or Upstash). 
- Free tier: Single Redis instance
- Pro+: Redis with persistence + replicas
