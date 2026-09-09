import os
import time
import platform
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from typing import Dict, Any
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.storage.db import get_engine, SQLALCHEMY_DATABASE_URL, _redacted_url

_start_time = time.time()

_db_executor = ThreadPoolExecutor(max_workers=2)


def get_uptime() -> float:
    return time.time() - _start_time


def _check_database() -> Dict[str, Any]:
    try:
        engine = get_engine()
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return {"status": "healthy", "dialect": engine.dialect.name}
    except Exception as e:
        return {"status": "unhealthy", "error": _safe_error(e)}


def _safe_error(exc: Exception) -> str:
    """Short redacted error message (never leaks DATABASE_URL credentials)."""
    msg = str(exc).strip()
    if not msg:
        return exc.__class__.__name__
    return msg[:200]


def _check_database_with_timeout(timeout_seconds: int = 5) -> Dict[str, Any]:
    """Run the DB probe on a worker thread with a hard wall-clock timeout so a
    misconfigured or unreachable database can never hang the health endpoints."""
    future = _db_executor.submit(_check_database)
    try:
        return future.result(timeout=timeout_seconds)
    except Exception:
        future.cancel()
        return {"status": "unhealthy", "error": f"database check timed out after {timeout_seconds}s"}


def _check_disk_space() -> Dict[str, Any]:
    try:
        import shutil
        usage = shutil.disk_usage(os.getcwd())
        return {
            "total_gb": round(usage.total / (1024**3), 2),
            "used_gb": round(usage.used / (1024**3), 2),
            "free_gb": round(usage.free / (1024**3), 2),
            "percent_used": round((usage.used / usage.total) * 100, 1),
        }
    except Exception as e:
        return {"status": "unavailable", "error": str(e)}


async def health_check() -> Dict[str, Any]:
    db_status = _check_database_with_timeout()
    infra = _check_infra()
    overall = "healthy" if db_status["status"] == "healthy" else "degraded"
    if overall == "healthy" and infra.get("status") == "unhealthy":
        overall = "degraded"

    return {
        "status": overall,
        "service": "sentinelai-api",
        "version": os.getenv("APP_VERSION", "1.0.0"),
        "uptime_seconds": get_uptime(),
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "checks": {
            "database": db_status,
            "queue": infra,
        },
    }


def _check_infra() -> Dict[str, Any]:
    """Cheap, non-blocking view of the async queue + Redis availability."""
    try:
        from app.infra.queue import get_queue
        from app.infra.redis import redis_available

        queue = get_queue()
        queue_health = queue.health()
        status = "working" if queue_health.get("active") else "unavailable"
        if status == "working" and not redis_available():
            status = "degraded"
        return {
            "status": status,
            "mode": queue.kind.value,
            "worker_running": queue.worker_running,
            "pending": queue_health.get("queue_depth", 0),
            "redis_available": redis_available(),
        }
    except Exception as exc:  # pragma: no cover
        return {"status": "unhealthy", "error": _safe_error(exc)}


async def readiness_check() -> Dict[str, Any]:
    db_status = _check_database_with_timeout()
    infra = _check_infra()
    ready = db_status["status"] == "healthy"

    return {
        "status": "ready" if ready else "not_ready",
        "service": "sentinelai-api",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "checks": {
            "database": db_status,
            "queue": infra,
        },
    }


async def liveness_check() -> Dict[str, Any]:
    return {
        "status": "alive",
        "service": "sentinelai-api",
        "uptime_seconds": get_uptime(),
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "hostname": platform.node(),
        "python_version": platform.python_version(),
        "platform": platform.platform(),
    }


def get_debug_info() -> Dict[str, Any]:
    return {
        "database_url_set": bool(os.getenv("DATABASE_URL")),
        "database_url_redacted": _redacted_url(SQLALCHEMY_DATABASE_URL),
        "environment": os.getenv("ENVIRONMENT", "development"),
        "log_level": os.getenv("LOG_LEVEL", "INFO"),
        "log_format": os.getenv("LOG_FORMAT", "json"),
        "uptime_seconds": get_uptime(),
        "service": "sentinelai-api",
    }
