# SentinelAI

AI safety monitoring for production LLM applications. Catch hallucinations, jailbreak attempts, and unsafe outputs before they reach your users.

SentinelAI sits between your application and your AI model, analyzing every prompt and response pair in real-time. It detects fabricated claims, numeric inconsistencies, entity confusion, prompt injections, and more — then returns a trust score and a corrected response you can serve immediately.

## Quick Start

### 1. Sign up and create an organization

Go to [sentinelaihq.com](https://sentinelaihq.com) and sign in with GitHub or Google. You'll be prompted to create an organization — this is your team workspace where you manage API keys, invite members, and view risk logs.

### 2. Get your API key

Navigate to **API Keys** in your organization dashboard. Create a new key and copy it. This key authenticates your SDK and API requests.

### 3. Install the SDK

```bash
pip install sentinelai-sdk
```

### 4. Analyze your first exchange

```python
from sentinelai import SentinelAIClient

client = SentinelAIClient(
    base_url="https://sentinel-ai-dml3.onrender.com",
    api_key="sk_your_api_key_here"
)

result = client.verify(
    prompt="What was Apple's revenue in 2025?",
    response="Apple reported $395 billion in revenue for fiscal year 2025."
)

print(result.score)       # 0-100 trust score
print(result.status)      # "trusted", "needs_review", or "hallucinated"
print(result.corrected)   # corrected version if hallucinations found
```

## How It Works

```
User → Your App → AI Model → Response → SentinelAI → Decision → User
                      ↑                          |
                      └──── Verification ─────────┘
```

Every exchange goes through six parallel detectors:

| Detector | What it catches |
|----------|----------------|
| Unsupported Claim | Statements of fact not backed by provided context |
| Fabricated Citation | References to papers, cases, or statistics that don't exist |
| Numeric Drift | Numbers or quantities inconsistent with source material |
| Entity Confusion | Conflating two similar people, places, or products |
| Context Contradiction | Response contradicts the prompt or conversation history |
| Overconfidence Marker | Definitive language around unverifiable claims |

Each detector runs in parallel. Results are weighted into a single **0–100 trust score**.

## Understanding Results

SentinelAI returns three outcomes:

| Band | Score | What to do |
|------|-------|------------|
| **Trusted** | 0–24 | No issues found. Serve the response as-is. |
| **Needs Review** | 25–59 | Minor concerns. Flag for human review or auto-correct low-risk spans. |
| **Hallucinated** | 60–100 | High-confidence fabrication. Block the response or serve the corrected version. |

### Correction

When the score is 25+, the response includes a `corrected` field — a rewritten version with flagged claims removed or fixed. You can serve this directly.

```python
if result.status == "hallucinated":
    return result.corrected  # serve the fix, not the flaw
```

## SDK Reference

### Installation

```bash
pip install sentinelai-sdk
```

### SentinelAIClient

```python
from sentinelai import SentinelAIClient

client = SentinelAIClient(
    base_url="https://sentinel-ai-dml3.onrender.com",
    api_key="sk_...",
    source="my-app",        # optional: identifier for your application
    timeout=10,             # optional: request timeout in seconds
    max_retries=3           # optional: retry on transient errors
)
```

### Methods

**`client.verify(prompt, response)`**

One-shot verification. Returns a `VerificationResult` with `score` (int), `status` (str), `corrected` (str or None), and `claims` (list of flagged claims).

```python
result = client.verify(
    prompt="What is the capital of France?",
    response="The capital of France is Paris."
)
print(result.score)   # 0
print(result.status)  # "trusted"
```

**`client.analyze(prompt, response, user_id?, session_id?)`**

Full analysis with risk decision and audit logging. Use this for production flows where you need compliance tracking.

```python
result = client.analyze(
    prompt="User message",
    response="AI response",
    user_id="user_123",
    session_id="session_456"
)

if result["decision"] == "block":
    return safe_fallback()
elif result["decision"] == "warn":
    log_for_review(result)
    return result["corrected_response"]
```

**`client.health_check()`**

Check backend connectivity.

### ConversationTracker

For multi-turn conversations, track context across exchanges:

```python
from sentinelai import ConversationTracker

tracker = ConversationTracker(client, session_id="conv_001")
result = tracker.analyze_turn(
    prompt="User message",
    response="AI response"
)
# The tracker automatically includes prior turns for context-aware analysis
```

### TypeScript SDK

```typescript
import { SentinelAIClient } from "sentinelai-sdk";

const client = new SentinelAIClient({
  apiKey: "sk_...",
  baseURL: "https://sentinel-ai-dml3.onrender.com"
});

const result = await client.verify({
  prompt: userMessage,
  response: llmResponse,
});

if (result.status === "hallucinated") {
  return result.corrected;
}
```

## API Endpoints

All API endpoints are available at `https://sentinel-ai-dml3.onrender.com/api`.

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/analyze` | POST | Full risk analysis with audit logging |
| `/analyze/external` | POST | Analysis for external/existing logs |
| `/logs` | GET | List risk logs |
| `/logs/{id}` | GET | Risk log detail |
| `/health` | GET | Backend health check |
| `/settings` | GET/PUT | Workspace risk settings |
| `/baselines` | GET/PUT | Baseline configuration |

Interactive API docs: [sentinel-ai-dml3.onrender.com/api/docs](https://sentinel-ai-dml3.onrender.com/api/docs)

## Dashboard

The web dashboard at [sentinelaihq.com](https://sentinelaihq.com) provides:

- **Risk Logs** — Browse all analyzed exchanges with scores, statuses, and detailed breakdowns
- **Playground** — Test prompts and responses directly in the browser
- **Usage Analytics** — Track token consumption, API call volume, and risk distribution
- **Baselines** — Configure risk thresholds per workspace
- **Settings** — Manage workspace configuration and notification preferences
- **Members** — Invite team members with Viewer, Developer, Admin, or Owner roles
- **Billing** — Manage subscription and view invoices

## Workspaces & Teams

Organizations can have multiple workspaces. Each workspace has independent settings, API keys, and risk logs. This is useful for separating development, staging, and production environments.

### Roles

| Role | Permissions |
|------|-------------|
| Viewer | View logs and dashboards only |
| Developer | View logs, run analysis, manage API keys |
| Admin | Full workspace management, invite members |
| Owner | All permissions + billing and workspace deletion |

## Integration Patterns

### Blocking Mode

Verify every response before it reaches the user. Block or correct unsafe responses.

```python
response = get_llm_response(prompt)
result = client.verify(prompt, response)
return result.corrected if result.corrected else response
```

### Monitoring Mode

Log all exchanges for analysis without blocking. Review flagged responses later.

```python
result = client.analyze(prompt, response, user_id=user.id)
if result["decision"] == "escalate":
    notify_team(result)
```

### Async Mode

Fire-and-forget verification for high-throughput applications. Process results asynchronously.

### Self-Hosted Mode

Deploy the backend on your own infrastructure. No customer data leaves your network.

## Configuration

### Risk Thresholds

Configure per-workspace thresholds in the dashboard under **Settings**:

| Threshold | Description | Default |
|-----------|-------------|---------|
| Allow max | Maximum score to allow without review | 24 |
| Warn min | Minimum score to flag for review | 25 |
| Block min | Minimum score to block | 60 |
| Escalate min | Minimum score to notify admins | 85 |

## Deployment

### Production URLs

| Component | URL |
|-----------|-----|
| Dashboard | [sentinelaihq.com](https://sentinelaihq.com) |
| API | [sentinel-ai-dml3.onrender.com](https://sentinel-ai-dml3.onrender.com) |
| API Docs | [sentinel-ai-dml3.onrender.com/api/docs](https://sentinel-ai-dml3.onrender.com/api/docs) |

### Local Development

```bash
# Backend
cd Backend
cp .env.example .env
pip install -r requirements.txt
uvicorn main:app --reload --port 8001

# Frontend
cd Frontend
npm install
npm run dev
```

### Docker

```bash
cd Backend
docker compose up
```

This starts the API, PostgreSQL, Nginx, Mailpit, Prometheus, and Grafana.

## Architecture

```
Backend (FastAPI)     Frontend (Next.js)     SDK (Python/TS)
     │                     │                     │
     └──────────┬──────────┘─────────────────────┘
                │
         ┌──────┴──────┐
         │  PostgreSQL  │
         └─────────────┘
```

The backend uses a modular detector pipeline:
1. **Signals** — Individual detectors (jailbreak, prompt anomaly, etc.)
2. **Scoring** — Aggregates signal results into a unified risk score
3. **Policy** — Applies thresholds and returns a decision
4. **Actions** — Executes the decision (allow, warn, block, escalate)

## Security

- Authentication via Clerk with GitHub and Google OAuth
- Role-based access control per workspace
- API key authentication for SDK requests
- All analysis results logged with full audit trail
- No customer data stored in self-hosted mode

## Support

- [sentinelaihq.com](https://sentinelaihq.com) — Dashboard and playground
- GitHub Issues — Bug reports and feature requests
- `support@sentinelai.dev` — Direct support
