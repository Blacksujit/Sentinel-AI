import logging
import time
import os
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.api.routes import router as api_router
from app.api.baseline_routes import router as baseline_router
from app.api.settings_routes_db import router as settings_router
from app.api.settings_routes import router as settings_ui_router
from app.api.api_keys_routes import router as api_keys_router
from app.api.org_api_keys_routes import router as org_api_keys_router
from app.api.orgs_routes import router as orgs_router
from app.api.members_routes import router as members_router
from app.api.usage_routes import router as usage_router
from app.api.user_routes import router as user_router
from app.api.learning_routes import router as learning_router
from app.api.workspace_routes import router as workspace_router
from app.storage.db import init_db

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup — fail fast with a clear message if DATABASE_URL is misconfigured
    try:
        init_db()
    except Exception as e:
        logging.critical("Database initialization failed: %s", e)
        raise
    # Log all registered routes for debugging
    print("\n=== Registered Routes ===")
    for route in app.routes:
        if hasattr(route, 'methods') and hasattr(route, 'path'):
            print(f"  {', '.join(route.methods)} {route.path}")
    print("=========================\n")
    
    yield
    
    # Shutdown (if needed)
    pass

app = FastAPI(title="Sentinel AI API", version="1.0.0", lifespan=lifespan)

# Load environment variables
from dotenv import load_dotenv
load_dotenv()  # Load from .env file

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
        "https://sentinel-ai-hazel.vercel.app",  # Your Vercel frontend URL
        "*"  # Temporarily allow all origins for debugging
    ],  # Frontend URLs
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

@app.middleware("http")
async def log_requests(request: Request, call_next):
    start = time.perf_counter()
    try:
        response = await call_next(request)
    except Exception as e:
        logging.exception(f"Unhandled error: {e}")
        # Re-raise to let FastAPI handle it
        raise
    duration_ms = (time.perf_counter() - start) * 1000

    line = f"{request.method} {request.url.path} -> {response.status_code} ({duration_ms:.2f}ms)"
    print(line, flush=True)
    logging.info(line)
    return response

# Include the analysis router
app.include_router(api_router, prefix="/api")

# Include the baseline management router
app.include_router(baseline_router, prefix="/api")

# Include the settings management router
app.include_router(settings_router, prefix="/api")

# Include API keys management router
app.include_router(api_keys_router, prefix="/api")

# Include multi-tenant routers
app.include_router(orgs_router, prefix="/api")
app.include_router(org_api_keys_router, prefix="/api")
app.include_router(members_router, prefix="/api")
app.include_router(usage_router, prefix="/api")

# Include user routes
app.include_router(user_router, prefix="/api")

# Include learning loop routes
app.include_router(learning_router, prefix="/api")

# Include workspace routes
app.include_router(workspace_router, prefix="/api")

@app.get("/api/health")
async def api_health_check():
    return {"status": "ok"}


@app.get("/api/debug")
async def debug_info():
    """Debug endpoint to check database and environment"""
    import os
    from app.storage.db import SQLALCHEMY_DATABASE_URL
    
    return {
        "database_url_set": bool(os.getenv("DATABASE_URL")),
        "database_url_prefix": SQLALCHEMY_DATABASE_URL.split("://")[0] if "://" in SQLALCHEMY_DATABASE_URL else "unknown",
        "environment": os.getenv("ENVIRONMENT", "production"),  # Default to production
        "sqlalchemy_url": SQLALCHEMY_DATABASE_URL[:50] + "..." if len(SQLALCHEMY_DATABASE_URL) > 50 else SQLALCHEMY_DATABASE_URL
    }


@app.get("/health")
async def health_check():
    """Health check endpoint to verify API is running."""
    return {"status": "ok"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000,  log_level="info")