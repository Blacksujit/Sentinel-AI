# SentinelAI Incident Response Guide

## Severity Levels

| Level | Definition | Response Time | Examples |
|-------|------------|---------------|----------|
| **SEV1** | Complete service outage | 15 min | API down, DB unreachable |
| **SEV2** | Major feature degradation | 1 hour | High latency, failed invites |
| **SEV3** | Minor issue | 4 hours | Non-critical bugs, cosmetic |
| **SEV4** | Informational | Next sprint | Performance tuning, warnings |

## Incident Response Playbooks

### SEV1: API Down

1. **Check Docker status**
   ```bash
   cd /opt/sentinelai/Backend
   docker compose ps
   docker compose logs --tail=100 sentinelai-api
   ```

2. **Check health endpoints**
   ```bash
   curl -f http://localhost:8000/health || echo "API unhealthy"
   curl -f http://localhost:8000/liveness || echo "API not alive"
   ```

3. **Restart service**
   ```bash
   docker compose restart sentinelai-api
   # or full restart:
   docker compose down && docker compose up -d
   ```

4. **Check database connectivity**
   ```bash
   docker compose exec sentinelai-db pg_isready -U sentinelai_user
   ```

5. **Escalate** if not resolved within 15 minutes.

### SEV1: Database Unreachable

1. **Check DB container**
   ```bash
   docker compose logs --tail=50 sentinelai-db
   ```

2. **Verify volume/mount**
   ```bash
   docker volume ls | grep postgres_data
   ```

3. **Check disk space**
   ```bash
   df -h
   docker system df
   ```

4. **Restore from backup**
   ```bash
   # Find latest backup
   ls -la /opt/sentinelai/backups/
   # Restore (PostgreSQL)
   gunzip < backups/sentinelai_pg_latest.sql.gz | psql "$DATABASE_URL"
   ```

### SEV2: High Error Rate (>5%)

1. **Check logs**
   ```bash
   docker compose logs --tail=200 sentinelai-api
   ```

2. **Check metrics**
   - Open Grafana → SentinelAI Overview dashboard
   - Check error rate panel
   - Filter by endpoint to isolate

3. **Check recent deployments**
   ```bash
   git log --oneline -10
   ```

4. **Rollback if needed**
   ```bash
   # Revert to previous image tag
   export IMAGE_TAG=<previous-sha>
   docker compose up -d sentinelai-api
   ```

### SEV2: High Latency (p95 > 2s)

1. **Check resource usage**
   ```bash
   docker stats --no-stream
   ```

2. **Check database performance**
   ```bash
   docker compose exec sentinelai-db psql -U sentinelai_user -d sentinelai -c "SELECT * FROM pg_stat_activity;"
   ```

3. **Scale workers**
   ```bash
   export UVICORN_WORKERS=4
   docker compose up -d sentinelai-api
   ```

## Runbooks

### Daily Operations

```bash
# Check all services
docker compose ps

# View live logs
docker compose logs -f --tail=50 sentinelai-api

# Database backup
bash Backend/scripts/backup-db.sh

# Health check
bash Backend/scripts/health-check.sh
```

### Backup & Restore

```bash
# Automated backup (cron)
0 2 * * * cd /opt/sentinelai && bash Backend/scripts/backup-db.sh >> /var/log/sentinelai-backup.log 2>&1

# Manual backup
bash Backend/scripts/backup-db.sh

# Restore PostgreSQL
gunzip < /opt/sentinelai/backups/sentinelai_pg_20260101_000000.sql.gz | psql "$DATABASE_URL"
```

### Update Procedure

```bash
# 1. Pull latest code
git pull origin main

# 2. Rebuild and restart
cd Backend
docker compose build sentinelai-api
docker compose up -d

# 3. Verify
bash ../scripts/health-check.sh
```

## Communication

During incidents, communicate through:
- **Slack/Discord**: `#incidents` channel
- **Status Page**: Update status page if SEV1
- **Post-mortem**: Schedule within 48 hours for SEV1/SEV2
