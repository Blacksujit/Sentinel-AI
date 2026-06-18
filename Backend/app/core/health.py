import os
import time
import platform
from datetime import datetime, timezone
from typing import Dict, Any
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.storage.db import get_engine, SQLALCHEMY_DATABASE_URL, _redacted_url

_start_time = time.time()


def get_uptime() -> float:
    return time.time() - _start_time


def _check_database() -> Dict[str, Any]:
    try:
        engine = get_engine()
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return {"status": "healthy", "dialect": engine.dialect.name}
    except Exception as e:
        return {"status": "unhealthy", "error": str(e)}


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
    db_status = _check_database()
    overall = "healthy" if db_status["status"] == "healthy" else "degraded"

    return {
        "status": overall,
        "service": "sentinelai-api",
        "version": os.getenv("APP_VERSION", "1.0.0"),
        "uptime_seconds": get_uptime(),
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "checks": {
            "database": db_status,
        },
    }


async def readiness_check() -> Dict[str, Any]:
    db_status = _check_database()
    ready = db_status["status"] == "healthy"

    return {
        "status": "ready" if ready else "not_ready",
        "service": "sentinelai-api",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "checks": {
            "database": db_status,
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
