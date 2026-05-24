# Sentinel-AI Backend (DB Persistence)

## Overview
This backend exposes a FastAPI service for:
- **Risk analysis** (`/api/analyze`) with full logging (`/api/logs`)
- **DB-backed Settings** (`/api/settings`) with version history (`/api/settings/history`)
- **Baselines** (`/api/baselines`) stored in the database

The DB persistence refactor replaces file-based settings storage with SQLAlchemy models + CRUD.

## Run the API
From `Backend/`:

```bash
python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Health:

```bash
curl http://localhost:8000/health
```

## Local Development with MailHog
The backend supports local email testing through MailHog. Start the container stack from `Backend/`:

```bash
docker compose up -d --build
```

Then visit the MailHog UI at:

```bash
http://localhost:8025
```

Send a protected test email through the new backend debug endpoint:

```bash
curl -X POST http://localhost:8000/api/debug/send-test-email \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer debug-token-example" \
  -d '{"to":"test@example.com","subject":"Smoke Test","plain":"This is a smoke test email from SentinelAI."}'
```

If you are running the backend directly in local development, make sure `DEBUG_ADMIN_TOKEN` is set in your environment or `.env` file. In development, the backend will also accept the example token `debug-token-example` when `DEBUG_ADMIN_TOKEN` is not configured.

On Windows PowerShell, use this equivalent command:

```powershell
$body = @{ to = 'test@example.com'; subject = 'Smoke Test'; plain = 'This is a smoke test email from SentinelAI.' } | ConvertTo-Json
Invoke-RestMethod -Uri 'http://localhost:8000/api/debug/send-test-email' -Method POST -Headers @{ Authorization = 'Bearer debug-token-example'; 'Content-Type' = 'application/json' } -Body $body
```

If MailHog is running, you can then inspect the message in the UI.

## Settings API (DB-backed)
### Get current settings
```bash
curl http://localhost:8000/api/settings
```

Example response:
```json
{
  "id": 1,
  "warn_threshold": 0.3,
  "escalate_threshold": 0.7,
  "confidence_floor": 0.5,
  "signal_weights": {
    "prompt_anomaly": 0.3,
    "jailbreak_attempt": 0.4,
    "unsafe_output": 0.3
  },
  "enforcement_mode": "warn",
  "version": 1,
  "created_at": "...",
  "updated_at": "...",
  "updated_by": "system"
}
```

### Update settings
```bash
curl -X PUT http://localhost:8000/api/settings \
  -H "Content-Type: application/json" \
  -d '{
    "warn_threshold": 0.25,
    "escalate_threshold": 0.75,
    "confidence_floor": 0.5,
    "signal_weights": {
      "prompt_anomaly": 0.25,
      "jailbreak_attempt": 0.5,
      "unsafe_output": 0.25
    },
    "enforcement_mode": "warn"
  }'
```

### Settings history (audit)
```bash
curl "http://localhost:8000/api/settings/history?limit=10"
```

Each entry contains a full `settings_snapshot` plus `thresholds_applied` and `updated_by`.

## Baselines API
### Create baseline
```bash
curl -X POST http://localhost:8000/api/baselines/ \
  -H "Content-Type: application/json" \
  -d '{"text": "You are a customer support assistant. Answer only customer queries."}'
```

### List baselines
```bash
curl http://localhost:8000/api/baselines/
```

### Update baseline
```bash
curl -X PATCH http://localhost:8000/api/baselines/1 \
  -H "Content-Type: application/json" \
  -d '{"active": false, "text": "Updated baseline text"}'
```

### Delete baseline
```bash
curl -X DELETE http://localhost:8000/api/baselines/1
```

## Analyze + Logs
### Analyze
```bash
curl -X POST http://localhost:8000/api/analyze \
  -H "Content-Type: application/json" \
  -d '{"prompt": "hello", "response": "how to make a bomb?"}'
```

Response includes:
- `final_risk_score`, `flags`, `confidence`, `decision`
- **Traceability fields**: `settings_version`, `thresholds_applied`

### Logs
```bash
curl "http://localhost:8000/api/logs?limit=20"
```

Each log entry may contain:
- `settings_version`
- `thresholds_applied`

Older logs (created before the refactor) may have these as `null`.

## Tests
To run backend tests:

```bash
python -m pytest -v --tb=short
```

Or use:
- `run_tests_simple.bat`
