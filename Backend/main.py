"""SentinelAI API — Production entrypoint with observability, health checks, and structured logging."""

import os
import time
import json
import logging
from contextlib import asynccontextmanager
from typing import Callable, Awaitable

from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from dotenv import load_dotenv
from prometheus_client import generate_latest, CONTENT_TYPE_LATEST, REGISTRY

load_dotenv()

from app.core.logging_config import setup_logging, get_logger, JSONLogFormatter
from app.core.metrics import (
    track_request_metrics,
    metrics_endpoint as prometheus_metrics_endpoint,
    CPU_USAGE,
    MEMORY_USAGE,
    ACTIVE_CONNECTIONS,
    DB_CONNECTION_POOL_SIZE,
    DB_CONNECTION_ACTIVE,
)
from app.core.health import health_check, readiness_check, liveness_check, get_debug_info
from app.core.circuit_breaker import CircuitBreakerRegistry
from app.api.routes import router as api_router
from app.api.baseline_routes import router as baseline_router
from app.api.settings_routes_db import router as settings_router
from app.api.api_keys_routes import router as api_keys_router
from app.api.org_api_keys_routes import router as org_api_keys_router
from app.api.orgs_routes import router as orgs_router
from app.api.members_routes import router as members_router
from app.api.usage_routes import router as usage_router
from app.api.user_routes import router as user_router
from app.api.learning_routes import router as learning_router
from app.api.workspace_routes import router as workspace_router
from app.api.workspace_intel_routes import router as workspace_intel_router
from app.api.webhooks import router as webhooks_router
from app.api.billing_routes import router as billing_router
from app.api.game_routes import router as game_router
from app.api.redteam_routes import router as redteam_router
from app.storage.db import init_db
from app.middleware.request_id import RequestIDMiddleware
from app.middleware.rate_limiter import RateLimitMiddleware
from app.middleware.plan_enforcer import PlanEnforcerMiddleware

logger = get_logger(__name__)

SERVICE_NAME = os.getenv("SERVICE_NAME", "sentinelai-api")
LOG_FORMAT = os.getenv("LOG_FORMAT", "json")

setup_logging()


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        env = os.getenv("ENVIRONMENT", "development")
        if env == "production":
            response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        response.headers["Content-Security-Policy"] = (
            "default-src 'self'; "
            "script-src 'self' 'unsafe-inline' 'unsafe-eval'; "
            "style-src 'self' 'unsafe-inline'; "
            "img-src 'self' data:; "
            "font-src 'self' data:; "
            "connect-src 'self'"
        )
        return response


class MetricsMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: Callable[[Request], Awaitable[Response]]):
        if request.url.path in ("/metrics", "/health", "/readiness", "/liveness"):
            return await call_next(request)

        start = time.perf_counter()
        response = await call_next(request)
        duration = time.perf_counter() - start
        track_request_metrics(
            method=request.method,
            endpoint=request.url.path,
            status_code=response.status_code,
            duration=duration,
        )
        return response


class StructuredLoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        request_id = getattr(request.state, "request_id", "unknown")
        start = time.perf_counter()
        response = await call_next(request)
        duration_ms = (time.perf_counter() - start) * 1000

        log_data = {
            "request_id": request_id,
            "method": request.method,
            "path": request.url.path,
            "status": response.status_code,
            "duration_ms": round(duration_ms, 2),
        }
        if response.status_code >= 500:
            logger.error(json.dumps(log_data), event_type="http_request")
        elif response.status_code >= 400:
            logger.warning(json.dumps(log_data), event_type="http_request")
        else:
            logger.info(json.dumps(log_data), event_type="http_request")

        return response


@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        init_db()
    except Exception as e:
        logging.critical("Database initialization failed: %s", e)
        raise

    for route in app.routes:
        if hasattr(route, "methods") and hasattr(route, "path"):
            logger.debug("Route registered: %s %s", ", ".join(route.methods), route.path)

    logger.info("SentinelAI API started", extra={"event_type": "startup", "service": SERVICE_NAME})
    yield
    logger.info("SentinelAI API shutting down", extra={"event_type": "shutdown"})


app = FastAPI(
    title="SentinelAI API",
    version=os.getenv("APP_VERSION", "1.0.0"),
    lifespan=lifespan,
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
)

app.add_middleware(PlanEnforcerMiddleware)
app.add_middleware(RateLimitMiddleware)
app.add_middleware(RequestIDMiddleware)
app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(StructuredLoggingMiddleware)
app.add_middleware(MetricsMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
        "https://sentinel-ai-hazel.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=[
        "Authorization",
        "Content-Type",
        "X-API-Key",
        "X-Request-ID",
        "X-Clerk-Auth-Token",
        "User-Agent",
    ],
)


@app.middleware("http")
async def system_metrics_collector(request: Request, call_next):
    try:
        import psutil
        CPU_USAGE.set(psutil.cpu_percent(interval=0.1))
        MEMORY_USAGE.set(psutil.virtual_memory().used)
    except Exception:
        pass
    response = await call_next(request)
    return response


app.include_router(api_router, prefix="/api")
app.include_router(baseline_router, prefix="/api")
app.include_router(settings_router, prefix="/api")
app.include_router(api_keys_router, prefix="/api")
app.include_router(orgs_router, prefix="/api")
app.include_router(org_api_keys_router, prefix="/api")
app.include_router(members_router, prefix="/api")
app.include_router(usage_router, prefix="/api")
app.include_router(user_router, prefix="/api")
app.include_router(learning_router, prefix="/api")
app.include_router(workspace_router, prefix="/api")
app.include_router(workspace_intel_router, prefix="/api")
app.include_router(webhooks_router, prefix="/api")
app.include_router(billing_router, prefix="/api")
app.include_router(game_router, prefix="/api")
app.include_router(redteam_router, prefix="/api")


# ── Health & Observability Endpoints ──────────────────────────────

@app.get("/health", tags=["Observability"])
async def get_health():
    return await health_check()


@app.get("/readiness", tags=["Observability"])
async def get_readiness():
    return await readiness_check()


@app.get("/liveness", tags=["Observability"])
async def get_liveness():
    return await liveness_check()


@app.get("/metrics", tags=["Observability"])
async def get_metrics(request: Request):
    return await prometheus_metrics_endpoint(request)


@app.get("/api/health", tags=["Observability"])
async def api_health_check():
    return await health_check()


@app.get("/api/debug", tags=["Observability"])
async def debug_info():
    return get_debug_info()


@app.get("/api/circuit-breakers", tags=["Observability"])
async def circuit_breaker_states():
    return {"circuit_breakers": CircuitBreakerRegistry.all_states()}


@app.post("/api/debug/send-test-email", tags=["Debug"])
async def send_test_email(request: Request):
    from fastapi import HTTPException

    env = os.getenv("ENVIRONMENT", "development")
    if env == "production":
        raise HTTPException(status_code=404, detail="Not found")

    try:
        body = await request.json()
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid JSON payload")

    if not body:
        raise HTTPException(status_code=400, detail="Request body is required")

    to = body.get("to")
    subject = body.get("subject", "SentinelAI test email")
    plain = body.get("plain", "This is a test email from SentinelAI.")
    html = body.get("html")

    if not to:
        raise HTTPException(status_code=400, detail="Missing required field: to")

    token = None
    auth = request.headers.get("Authorization")
    if auth and auth.startswith("Bearer "):
        token = auth.split(" ", 1)[1]
    header_token = request.headers.get("X-Debug-Token")
    if header_token:
        token = header_token

    expected = os.getenv("DEBUG_ADMIN_TOKEN")
    if not expected:
        raise HTTPException(status_code=500, detail="DEBUG_ADMIN_TOKEN is not configured")

    if token != expected:
        raise HTTPException(status_code=403, detail="Forbidden: invalid debug token")

    from app.services.email_service import EmailService
    ok = await EmailService.send_plain_email(to_email=to, subject=subject, plain_body=plain, html_body=html)
    return {"sent": ok, "to": to}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=int(os.getenv("PORT", "8000")),
        log_level=os.getenv("LOG_LEVEL", "info").lower(),
        workers=int(os.getenv("UVICORN_WORKERS", "1")),
        proxy_headers=True,
        forwarded_allow_ips=os.getenv("FORWARDED_ALLOW_IPS", ""),
    )
