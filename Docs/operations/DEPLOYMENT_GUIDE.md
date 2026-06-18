# SentinelAI Deployment Guide

## Prerequisites

- Docker 24+ and Docker Compose v2
- Git
- 2 GB RAM minimum, 4 GB recommended
- Ubuntu 22.04/24.04 LTS (for production)

## Quick Start (Development)

```bash
# 1. Clone the repository
git clone <repo-url> /opt/sentinelai
cd /opt/sentinelai

# 2. Configure environment
cp Backend/.env.example Backend/.env
# Edit Backend/.env with your settings

# 3. Start the stack
cd Backend
docker compose up -d

# 4. Verify health
curl http://localhost:8000/health
curl http://localhost:8000/readiness
curl http://localhost:8000/liveness
```

## Production Deployment (AWS EC2)

### Step 1: Provision EC2 Instance

- **AMI**: Ubuntu 24.04 LTS
- **Instance Type**: t3.medium (minimum), t3.large (recommended)
- **Storage**: 20 GB gp3 (minimum)
- **Security Group**:
  - 22 (SSH) — your IP only
  - 80 (HTTP) — 0.0.0.0/0
  - 443 (HTTPS) — 0.0.0.0/0
  - 9090 (Prometheus) — internal only
  - 3000 (Grafana) — internal/your IP

### Step 2: Bootstrap Server

```bash
ssh -i your-key.pem ubuntu@<ec2-ip>
sudo apt-get update && sudo apt-get upgrade -y
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker ubuntu
# Log out and back in
```

### Step 3: Deploy Application

```bash
git clone <repo-url> /opt/sentinelai
cd /opt/sentinelai/Backend

# Configure production environment
cp .env.example .env.production
# Edit .env.production with production values:
#   DATABASE_URL=postgresql://... (use RDS or managed PostgreSQL)
#   CLERK_SECRET_KEY=...
#   SENTINELAI_API_KEYS=...
#   ENVIRONMENT=production
#   LOG_LEVEL=INFO

# Generate SSL certificates (or use Let's Encrypt)
bash scripts/generate-ssl.sh

# Start services
docker compose --env-file .env.production up -d

# Verify deployment
bash scripts/health-check.sh
```

### Step 4: Configure Domain & SSL (Production)

```bash
# Install certbot
sudo apt-get install -y certbot python3-certbot-nginx

# Get certificate
sudo certbot --nginx -d api.yourdomain.com

# Update nginx config with domain
# Edit nginx/conf.d/default.conf — replace server_name
```

## Environment Variables Reference

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | Yes | — | PostgreSQL connection string |
| `CLERK_SECRET_KEY` | Yes | — | Clerk API secret key |
| `SENTINELAI_API_KEYS` | Yes | — | Comma-separated API keys |
| `ENVIRONMENT` | No | `development` | Runtime environment |
| `LOG_LEVEL` | No | `INFO` | Logging level |
| `LOG_FORMAT` | No | `json` | Log format (json or text) |
| `SMTP_HOST` | No | `mailpit` | SMTP server hostname |
| `SMTP_PORT` | No | `1025` | SMTP server port |
| `FROM_EMAIL` | No | `noreply@sentinelai.com` | Sender email address |
| `FRONTEND_BASE_URL` | No | `http://localhost:3000` | Frontend URL for invite links |
| `UVICORN_WORKERS` | No | `2` | Number of uvicorn workers |
| `ALLOW_SQLITE_FALLBACK` | No | `false` | Fallback to SQLite if PG unavailable |

## Health Check Endpoints

| Endpoint | Purpose | Expected Response |
|----------|---------|-------------------|
| `GET /health` | Full health (DB + deps) | `{"status":"healthy",...}` |
| `GET /readiness` | Ready to serve traffic | `{"status":"ready",...}` |
| `GET /liveness` | Process alive | `{"status":"alive",...}` |
| `GET /metrics` | Prometheus metrics | Prometheus text format |
