# ── Stage 1: Build ─────────────────────────────────────────────────
FROM python:3.11.5-slim AS builder

WORKDIR /build

RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    g++ \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir --user -r requirements.txt

# ── Stage 2: Runtime ──────────────────────────────────────────────
FROM python:3.11.5-slim AS runtime

ARG APP_VERSION=1.0.0
ARG BUILD_DATE
ARG COMMIT_SHA

LABEL org.opencontainers.image.title="SentinelAI API" \
      org.opencontainers.image.description="AI risk monitoring and observability platform" \
      org.opencontainers.image.version="${APP_VERSION}" \
      org.opencontainers.image.created="${BUILD_DATE}" \
      org.opencontainers.image.revision="${COMMIT_SHA}" \
      org.opencontainers.image.vendor="SentinelAI"

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    APP_VERSION=${APP_VERSION} \
    SERVICE_NAME=sentinelai-api \
    LOG_FORMAT=json \
    LOG_LEVEL=INFO

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/* \
    && adduser --disabled-password --gecos "" appuser

COPY --from=builder /root/.local /usr/local
COPY --chown=appuser:appuser . .

USER appuser

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD curl -sf http://localhost:8000/health | python -c "import sys,json; d=json.load(sys.stdin); sys.exit(0 if d.get('status')=='healthy' else 1)" || exit 1

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
