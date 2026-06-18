# SentinelAI Infrastructure Documentation

## System Requirements

### Minimum (Development)
- 2 CPU cores
- 2 GB RAM
- 10 GB disk
- Docker 24+ / Docker Compose v2

### Recommended (Production)
- 4 CPU cores
- 8 GB RAM
- 50 GB SSD (gp3)
- Docker 24+ / Docker Compose v2
- Ubuntu 24.04 LTS

## Service Topology

```
┌─────────────────────────────────────────────────────────────────┐
│                        EC2 / Bare Metal                          │
│                                                                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────────┐ │
│  │  Nginx   │  │   API    │  │PostgreSQL│  │  Observability   │ │
│  │ :80/:443 │──│ :8000    │──│ :5432    │  │  Prom/Grafana    │ │
│  └──────────┘  └──────────┘  └──────────┘  └──────────────────┘ │
│       │                                                          │
│  ┌────┴─────┐                                                    │
│  │  Mailpit │                                                    │
│  │ :1025    │                                                    │
│  └──────────┘                                                    │
└─────────────────────────────────────────────────────────────────┘
```

## Volumes

| Volume | Mount | Purpose | Backup Required |
|--------|-------|---------|----------------|
| `postgres_data` | `/var/lib/postgresql/data` | Database files | Yes |
| `prometheus_data` | `/prometheus` | Metrics time-series | Optional |
| `grafana_data` | `/var/lib/grafana` | Dashboard configs | Optional |

## Networking

### Docker Network: `sentinelai-network`
- Bridge driver
- Internal DNS resolution by service name
- No external network access for DB/Prometheus

### Port Mapping

| Service | Internal Port | External Port | Protocol |
|---------|--------------|---------------|----------|
| Nginx | 80, 443 | 80, 443 | TCP |
| API | 8000 | — | TCP (internal) |
| PostgreSQL | 5432 | — | TCP (internal) |
| Prometheus | 9090 | 9090* | TCP |
| Grafana | 3000 | 3000* | TCP |
| Mailpit | 8025 | 8025* | TCP |

*\* Recommended to restrict via security group / firewall*

## Backup Strategy

### Automated Backup (via cron)

```cron
# Daily database backup at 2 AM
0 2 * * * cd /opt/sentinelai && bash Backend/scripts/backup-db.sh >> /var/log/sentinelai-backup.log 2>&1

# Weekly Docker image cleanup
0 3 * * 0 docker image prune -f >> /var/log/docker-cleanup.log 2>&1
```

### Backup Retention
- Daily backups: 30 days
- Monthly backups: 12 months (manual archive)

## Monitoring Stack

### Prometheus
- **Retention**: 15 days (configurable via `PROMETHEUS_RETENTION`)
- **Scrape Interval**: 15 seconds
- **Storage**: `prometheus_data` volume

### Grafana
- **Default dashboards**: SentinelAI Platform Overview
- **DataSource**: Prometheus (auto-provisioned)
- **Auth**: Local admin (configurable)

## Security Considerations

1. **Network Isolation**: All internal services on bridge network
2. **SSL/TLS**: Nginx handles SSL termination
3. **Rate Limiting**: 100 req/s per IP on API routes
4. **Health Endpoints**: Unthrottled for monitoring systems
5. **Metrics Endpoint**: Internal network only
6. **Container Security**: Non-root user, read-only root fs where possible
7. **Secret Management**: Environment variables via `.env` files

## Disaster Recovery

### Recovery Steps

1. **Provision new server** (or redeploy existing)
2. **Install dependencies**: Docker, Git
3. **Restore backups**: Database + config
4. **Deploy application**: Git clone + docker compose up
5. **Verify**: Run `scripts/health-check.sh`

### RTO/RPO Targets
- **RTO** (Recovery Time Objective): 1 hour
- **RPO** (Recovery Point Objective): 24 hours (daily backups)
