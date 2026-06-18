import time
from functools import wraps
from prometheus_client import Counter, Histogram, Gauge, generate_latest, REGISTRY
from prometheus_client import CONTENT_TYPE_LATEST
from starlette.responses import Response
from starlette.requests import Request
from typing import Callable, Any

REQUEST_COUNT = Counter(
    "sentinelai_http_requests_total",
    "Total HTTP requests",
    ["method", "endpoint", "status"],
)

REQUEST_LATENCY = Histogram(
    "sentinelai_http_request_duration_seconds",
    "HTTP request latency in seconds",
    ["method", "endpoint"],
    buckets=(0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0),
)

ERROR_COUNT = Counter(
    "sentinelai_http_errors_total",
    "Total HTTP errors",
    ["method", "endpoint", "status"],
)

RISK_ANALYSIS_VOLUME = Counter(
    "sentinelai_risk_analysis_total",
    "Total risk analyses performed",
    ["source", "decision"],
)

CPU_USAGE = Gauge("sentinelai_cpu_usage_percent", "Current CPU usage percentage")
MEMORY_USAGE = Gauge("sentinelai_memory_usage_bytes", "Current memory usage in bytes")
ACTIVE_CONNECTIONS = Gauge("sentinelai_active_connections", "Current active connections")
DB_CONNECTION_POOL_SIZE = Gauge("sentinelai_db_connection_pool_size", "Database connection pool size")
DB_CONNECTION_ACTIVE = Gauge("sentinelai_db_connection_active", "Active database connections")


def track_request_metrics(method: str, endpoint: str, status_code: int, duration: float):
    REQUEST_COUNT.labels(method=method, endpoint=endpoint, status=status_code).inc()
    REQUEST_LATENCY.labels(method=method, endpoint=endpoint).observe(duration)
    if status_code >= 400:
        ERROR_COUNT.labels(method=method, endpoint=endpoint, status=status_code).inc()


def track_risk_analysis(source: str, decision: str):
    RISK_ANALYSIS_VOLUME.labels(source=source, decision=decision).inc()


async def metrics_endpoint(request: Request) -> Response:
    return Response(content=generate_latest(REGISTRY), media_type=CONTENT_TYPE_LATEST)
