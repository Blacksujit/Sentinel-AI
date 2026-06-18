# SentinelAI Operations Runbooks

## Table of Contents

1. [Daily Operations](#1-daily-operations)
2. [Monitoring & Alerting](#2-monitoring--alerting)
3. [Database Management](#3-database-management)
4. [Log Management](#4-log-management)
5. [Scaling](#5-scaling)
6. [Security](#6-security)

---

## 1. Daily Operations

### Morning Checks

```bash
# 1. Check service status
docker compose ps
docker compose logs --tail=20 sentinelai-api sentinelai-db nginx

# 2. Check health endpoints
curl -s http://localhost:8000/health | python -m json.tool
curl -s http://localhost:8000/readiness | python -m json.tool

# 3. Check disk space
df -h /var/lib/docker

# 4. Check backup freshness
ls -la /opt/sentinelai/backups/ | tail -5
```

### Weekly Tasks

```bash
# 1. Review error logs
docker compose logs --since=7d sentinelai-api | grep -i error

# 2. Update base images
docker compose pull
docker compose up -d

# 3. Prune unused resources
docker system prune -f --volumes

# 4. Verify backup integrity
ls -lh /opt/sentinelai/backups/
```

---

## 2. Monitoring & Alerting

### Grafana Access

- **URL**: http://<server-ip>:3000
- **Default credentials**: admin / admin
- **Dashboards**: SentinelAI Platform Overview

### Prometheus Queries (Useful)

```promql
# Request rate by endpoint (last 5m)
rate(sentinelai_http_requests_total[5m])

# Error rate percentage
rate(sentinelai_http_errors_total[5m]) / rate(sentinelai_http_requests_total[5m]) * 100

# p95 latency
histogram_quantile(0.95, rate(sentinelai_http_request_duration_seconds_bucket[5m]))

# Risk analysis rate by decision
rate(sentinelai_risk_analysis_total[5m])

# Active connections
sentinelai_active_connections
```

### Log Aggregation Commands

```bash
# Tail logs with JSON parsing
docker compose logs -f --tail=100 sentinelai-api | grep --line-buffered "event_type"

# Filter errors only
docker compose logs --since=1h sentinelai-api | python -c "
import sys, json
for line in sys.stdin:
    try:
        d = json.loads(line.strip())
        if d.get('severity') in ('ERROR', 'CRITICAL'):
            print(json.dumps(d, indent=2))
    except: pass
"
```

---

## 3. Database Management

### PostgreSQL Maintenance

```bash
# Connect to database
docker compose exec sentinelai-db psql -U sentinelai_user -d sentinelai

# Common queries
\l                                    # List databases
\d                                    # List tables
SELECT * FROM pg_stat_activity;       # Active connections
VACUUM ANALYZE;                       # Optimize tables
REINDEX DATABASE sentinelai;           # Rebuild indexes

# Connection pool check
SELECT count(*) FROM pg_stat_activity;
SHOW max_connections;
```

### Migration Commands

```bash
# Run pending migrations
docker compose exec sentinelai-api python migrate_db.py

# Check migration status
docker compose exec sentinelai-api python check_db.py
```

---

## 4. Log Management

Docker uses the `json-file` log driver with:
- Max size: 10 MB per file
- Max files: 3 per container

### Log Operations

```bash
# View all services
docker compose logs -f

# View specific service
docker compose logs -f sentinelai-api

# Last N lines
docker compose logs --tail=200 sentinelai-api

# Since timestamp
docker compose logs --since="2026-01-01T00:00:00" sentinelai-api

# Export logs to file
docker compose logs --no-color sentinelai-api > /var/log/sentinelai/api-export.log
```

---

## 5. Scaling

### Vertical Scaling

```yaml
# In docker-compose.yml, increase workers:
environment:
  UVICORN_WORKERS: "4"
```

### Horizontal Scaling (Future)

For multi-instance deployment:
```yaml
# docker-compose.yml with replicas
sentinelai-api:
  deploy:
    replicas: 3
```

---

## 6. Security

### SSL Certificate Renewal

```bash
# Let's Encrypt (auto-renewal)
sudo certbot renew --nginx

# Manual renewal check
sudo certbot certificates
```

### API Key Rotation

```bash
# Generate new key
openssl rand -hex 32

# Update .env.production and restart
docker compose up -d sentinelai-api
```

### Firewall Rules

```bash
# Current rules
sudo ufw status verbose

# Allow only specific IPs to Grafana
sudo ufw allow from <your-ip> to any port 3000
```

---

## Troubleshooting Quick Reference

| Symptom | Check | Solution |
|---------|-------|----------|
| API won't start | `docker compose logs sentinelai-api` | Check DATABASE_URL / CLERK_SECRET_KEY |
| DB connection failed | `docker compose logs sentinelai-db` | Verify DB credentials / volume mount |
| High memory usage | `docker stats --no-stream` | Reduce UVICORN_WORKERS / add swap |
| SSL errors | `openssl verify /etc/nginx/ssl/cert.pem` | Regenerate or renew certificate |
| Emails not sending | `docker compose logs mailpit` | Check SMTP_HOST / SMTP_PORT config |
