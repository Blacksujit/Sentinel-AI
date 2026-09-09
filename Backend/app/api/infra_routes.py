"""Infrastructure observability and operation endpoints.

    GET  /api/infra/status        - queue/broker/db health summary
    GET  /api/infra/queue         - peek pending or dead-letter jobs
    POST /api/infra/queue/test    - push a job end-to-end to verify flow
    GET  /api/logs/stream         - recent structured logs (in-process tail)
"""

import asyncio
import logging
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Body, HTTPException, Query

from app.infra.config import BrokerKind, get_kafka_servers, get_redis_url, queue_mode
from app.infra.jobs import JOB_HANDLERS, enqueue_job, get_queue
from app.infra.log_store import tail_log
from app.infra.pubsub import health as pubsub_health
from app.infra.redis import redis_available

logger = logging.getLogger(__name__)

router = APIRouter(tags=["infra"])


async def _db_info() -> Dict[str, Any]:
    from app.storage.db import get_engine

    try:
        engine = get_engine()
        return {
            "dialect": engine.dialect.name,
            "connected": True,
        }
    except Exception as exc:  # pragma: no cover
        return {"dialect": "unknown", "connected": False, "error": str(exc)}


@router.get("/api/infra/status")
async def infra_status() -> Dict[str, Any]:
    queue = get_queue()
    health = await queue.health()
    return {
        "queue": health,
        "brokers": {
            "active_mode": queue.kind.value,
            "environment": {
                "redis_url_set": bool(get_redis_url()),
                "kafka_servers": get_kafka_servers() or None,
            },
        },
        "redis": {"available": redis_available()},
        "pubsub": await pubsub_health(),
        "database": await _db_info(),
        "handlers": sorted(JOB_HANDLERS.keys()),
    }


@router.get("/api/infra/queue")
async def queue_peek(
    kind: str = Query("stream", pattern="^(stream|dlq)$"),
    limit: int = Query(20, ge=1, le=200),
) -> Dict[str, Any]:
    queue = get_queue()
    jobs = await queue.peek(kind=kind, limit=limit)
    return {
        "queue_mode": queue.kind.value,
        "kind": kind,
        "count": len(jobs),
        "jobs": jobs,
    }


@router.post("/api/infra/queue/test")
async def queue_test(
    payload: Optional[Dict[str, Any]] = Body(default=None, description="Optional echo payload"),
) -> Dict[str, Any]:
    queue = get_queue()
    if not queue.active:
        await queue.start()
    echo = payload or {"source": "api", "message": "queue test"}
    job_id = await enqueue_job("echo", echo)
    if job_id is None:
        raise HTTPException(status_code=503, detail="Job queue unavailable")
    logger.info("Queue test job enqueued: %s (mode=%s)", job_id, queue.kind.value)
    return {"ok": True, "job_id": job_id, "mode": queue.kind.value}


@router.get("/api/logs/stream")
async def log_stream(
    limit: int = Query(100, ge=1, le=5000),
    level: Optional[str] = Query(None, pattern="^(DEBUG|INFO|WARNING|ERROR|CRITICAL)$"),
) -> Dict[str, Any]:
    records: List[Dict[str, Any]] = await tail_log.tail(limit=limit)
    if level:
        order = {"DEBUG": 10, "INFO": 20, "WARNING": 30, "ERROR": 40, "CRITICAL": 50}
        min_level = order[level]
        sev = {"DEBUG": 10, "INFO": 20, "WARNING": 30, "ERROR": 40, "CRITICAL": 50}
        records = [r for r in records if sev.get(r.get("severity"), 20) >= min_level]
    return {
        "count": len(records),
        "tail_size": tail_log._maxlen,
        "records": records,
    }


async def update_infra_gauges() -> None:
    """Periodically refresh infra gauges in the background."""
    from app.core.metrics import (
        QUEUE_DEPTH,
        QUEUE_DLQ_DEPTH,
        QUEUE_MODE,
        QUEUE_WORKER_RUNNING,
        REDIS_UP,
    )

    mode_rank = {BrokerKind.MEMORY: 0, BrokerKind.REDIS: 1, BrokerKind.KAFKA: 2}
    while True:
        try:
            queue = get_queue()
            QUEUE_DEPTH.set(await queue.depth())
            QUEUE_DLQ_DEPTH.set(await queue.dlq_depth())
            QUEUE_MODE.set(mode_rank.get(queue.kind, 0))
            QUEUE_WORKER_RUNNING.set(1 if queue.worker_running else 0)
            REDIS_UP.set(1 if redis_available() else 0)
        except Exception:  # pragma: no cover
            logger.debug("infra gauge update failed", exc_info=True)
        await asyncio.sleep(5)