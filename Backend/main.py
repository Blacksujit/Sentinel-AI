import logging
import time
import os
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from app.api.routes import router
from app.api.baseline_routes import router as baseline_router
from app.api.settings_routes_db import router as settings_router
from app.storage.db import init_db

app = FastAPI(title="Sentinel AI API", version="1.0.0")

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
    ],  # Frontend URLs
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup_event():
    init_db()

@app.middleware("http")
async def log_requests(request: Request, call_next):
    start = time.perf_counter()
    response = await call_next(request)
    duration_ms = (time.perf_counter() - start) * 1000

    line = f"{request.method} {request.url.path} -> {response.status_code} ({duration_ms:.2f}ms)"
    print(line, flush=True)
    logging.info(line)
    return response

# Include the analysis router
app.include_router(router, prefix="/api")

# Include the baseline management router
app.include_router(baseline_router, prefix="/api")

# Include the settings management router
app.include_router(settings_router, prefix="/api")


@app.get("/health")
async def health_check():
    """Health check endpoint to verify API is running."""
    return {"status": "ok"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000,  log_level="info")