#!/usr/bin/env bash
set -euo pipefail

# ──────────────────────────────────────────────────────────────────
# SentinelAI Database Backup Script
# ──────────────────────────────────────────────────────────────────
# Supports PostgreSQL (pg_dump) and SQLite (.db file copy).
# ──────────────────────────────────────────────────────────────────

BACKUP_DIR="${BACKUP_DIR:-/opt/sentinelai/backups}"
DB_URL="${DATABASE_URL:-}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
TIMESTAMP="$(date -u '+%Y%m%d_%H%M%S')"

mkdir -p "$BACKUP_DIR"

log() { echo "[$(date -u '+%H:%M:%S')] $*"; }

# ── PostgreSQL Backup ─────────────────────────────────────────────
if [[ "$DB_URL" == postgresql://* ]] || [[ "$DB_URL" == postgres://* ]]; then
    log "PostgreSQL detected. Running pg_dump..."
    BACKUP_FILE="$BACKUP_DIR/sentinelai_pg_$TIMESTAMP.sql.gz"

    pg_dump "$DB_URL" --no-owner --no-acl | gzip > "$BACKUP_FILE"
    log "Backup saved: $BACKUP_FILE ($(du -h "$BACKUP_FILE" | cut -f1))"

# ── SQLite Backup ─────────────────────────────────────────────────
elif [[ "$DB_URL" == sqlite:///* ]]; then
    DB_PATH="${DB_URL#sqlite:///}"
    DB_PATH="/app/$DB_PATH"

    if [ ! -f "$DB_PATH" ]; then
        log "SQLite database not found at $DB_PATH — skipping."
        exit 1
    fi

    BACKUP_FILE="$BACKUP_DIR/sentinelai_sqlite_$TIMESTAMP.db"
    cp "$DB_PATH" "$BACKUP_FILE"
    log "Backup saved: $BACKUP_FILE ($(du -h "$BACKUP_FILE" | cut -f1))"
else
    log "DATABASE_URL not set or unrecognized — skipping backup."
    exit 1
fi

# ── Retention cleanup ─────────────────────────────────────────────
log "Cleaning up backups older than $RETENTION_DAYS days..."
find "$BACKUP_DIR" -name "sentinelai_*" -type f -mtime "+$RETENTION_DAYS" -delete
log "Done."
