# SentinelAI Production Architecture

## Overview

SentinelAI runs as a multi-service Docker Compose stack behind Nginx with integrated observability via Prometheus + Grafana.

```
Internet
   │
   ▼
┌─────────────────────────────────────────────┐
│          Nginx (Reverse Proxy)               │
│  Port 80/443 • Rate Limiting • SSL • Gzip    │
└──────────┬──────────────────────────────────┘
           │
           ▼
┌──────────────────────┐     ┌──────────────────┐
│   sentinelai-api     │     │     Mailpit      │
│   FastAPI + Uvicorn  │◄───►│  SMTP :1025      │
│   Port 8000          │     │  WebUI:8025      │
└────────┬─────────────┘     └──────────────────┘
         │
         ▼
┌──────────────────────┐
│   PostgreSQL 15      │
│   Port 5432          │
└──────────────────────┘

┌──────────────────────────────────────────────┐
│           Observability Stack                 │
│                                               │
│  sentinelai-api ──► /metrics ──► Prometheus   │
│                                  Port 9090    │
│                                       │       │
│                                       ▼       │
│                                  Grafana      │
│                                  Port 3000    │
└──────────────────────────────────────────────┘
```

## Service Mesh

| Service | Protocol | Port | Purpose |
|---------|----------|------|---------|
| Nginx | HTTP/HTTPS | 80/443 | Reverse proxy, SSL, rate limiting |
| API | HTTP | 8000 | FastAPI application |
| PostgreSQL | TCP | 5432 | Primary database |
| Mailpit | SMTP/HTTP | 1025/8025 | Email testing |
| Prometheus | HTTP | 9090 | Metrics collection |
| Grafana | HTTP | 3000 | Dashboards & visualization |

## Data Flow

1. **Client Request** → Nginx (SSL termination, rate limiting)
2. **Nginx** → sentinelai-api (reverse proxy, buffering)
3. **sentinelai-api** → PostgreSQL (data persistence)
4. **sentinelai-api** → Mailpit (email delivery for dev)
5. **sentinelai-api** → Prometheus (metrics scraping via /metrics)
6. **Prometheus** → Grafana (dashboard queries)

## Network Architecture

- All services run on a dedicated Docker bridge network: `sentinelai-network`
- Only Nginx exposes ports to the host
- API, DB, and monitoring services communicate internally
- Prometheus scrapes metrics from API on the internal network
