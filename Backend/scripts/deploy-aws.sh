#!/usr/bin/env bash
set -euo pipefail

# ──────────────────────────────────────────────────────────────────
# SentinelAI AWS EC2 Deployment Script
# ──────────────────────────────────────────────────────────────────
# Prerequisites:
#   - Docker & Docker Compose installed on EC2
#   - Git clone of repository on EC2
#   - Environment variables configured in .env.production
# ──────────────────────────────────────────────────────────────────

APP_DIR="${APP_DIR:-/opt/sentinelai}"
ENV_FILE="${ENV_FILE:-$APP_DIR/.env.production}"
COMPOSE_FILE="${COMPOSE_FILE:-$APP_DIR/Backend/docker-compose.yml}"
IMAGE_TAG="${IMAGE_TAG:-latest}"

echo "==> SentinelAI Deployment Starting"
echo "    Directory: $APP_DIR"
echo "    Tag:       $IMAGE_TAG"

cd "$APP_DIR"

# ── Pull latest code ──────────────────────────────────────────────
if [ -d .git ]; then
    echo "==> Pulling latest code..."
    git pull origin main
fi

# ── Load environment ──────────────────────────────────────────────
if [ -f "$ENV_FILE" ]; then
    echo "==> Loading environment from $ENV_FILE"
    set -a
    source "$ENV_FILE"
    set +a
fi

# ── Pull images ───────────────────────────────────────────────────
echo "==> Pulling Docker images..."
docker compose -f "$COMPOSE_FILE" pull

# ── Deploy ────────────────────────────────────────────────────────
echo "==> Deploying services..."
docker compose -f "$COMPOSE_FILE" up -d --remove-orphans

# ── Health check ──────────────────────────────────────────────────
echo "==> Waiting for API to be healthy..."
for i in $(seq 1 30); do
    if curl -sf http://localhost:8000/health > /dev/null 2>&1; then
        echo "    API is healthy!"
        break
    fi
    if [ "$i" -eq 30 ]; then
        echo "    ERROR: API health check failed after 30 attempts"
        docker compose -f "$COMPOSE_FILE" logs --tail=50 sentinelai-api
        exit 1
    fi
    echo "    Waiting... ($i/30)"
    sleep 2
done

# ── Cleanup ───────────────────────────────────────────────────────
echo "==> Cleaning up old images..."
docker image prune -f

echo "==> Deployment complete!"
echo "    API:      http://localhost:8000"
echo "    Grafana:  http://localhost:3000"
echo "    Mailpit:  http://localhost:8025"
