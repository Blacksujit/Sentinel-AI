# 04 - Enterprise SDK Enhancements

## Objective
Upgrade the Python SDK with enterprise features: batch analysis, async support, webhook subscriptions, configurable retry policies, and TypeScript SDK creation.

## Files to Create/Modify

### Modified Files (Python SDK)
| File | Change |
|------|--------|
| `sentinelai-sdk/sentinelai/client.py` | Add `batch_analyze()`, `async_analyze()`, webhook methods, retry policies |
| `sentinelai-sdk/sentinelai/__init__.py` | Export new classes |

### New Files (TypeScript SDK)
| File | Purpose |
|------|---------|
| `sentinelai-sdk/typescript/src/index.ts` | Main client class |
| `sentinelai-sdk/typescript/src/types.ts` | TypeScript type definitions |
| `sentinelai-sdk/typescript/package.json` | npm package config |
| `sentinelai-sdk/typescript/tsconfig.json` | TypeScript config |

## Implementation

### 1. Batch Analysis (`analyze_batch`)
```python
def analyze_batch(
    self,
    items: List[Dict[str, str]],
    concurrency: int = 5
) -> List[Dict[str, Any]]:
    """Analyze multiple prompt/response pairs in parallel.
    Items format: [{"prompt": "...", "response": "..."}]
    """
```
Parallelizes calls using `ThreadPoolExecutor` with configurable concurrency.

### 2. Async Webhook Subscriptions
```python
def create_webhook(
    self, org_id: str, url: str, events: List[str],
    secret: Optional[str] = None
) -> Dict[str, Any]:
    """Subscribe to real-time analysis events via webhook."""

def list_webhooks(self, org_id: str) -> List[Dict[str, Any]]:
    """List all webhook subscriptions for an organization."""

def delete_webhook(self, org_id: str, webhook_id: str) -> None:
    """Remove a webhook subscription."""
```

### 3. Configurable Retry Policy
```python
client = SentinelAIClient(
    base_url="...",
    api_key="...",
    retry_policy={
        "max_retries": 5,
        "backoff_factor": 2.0,  # exponential: 1s, 2s, 4s, 8s, 16s
        "max_backoff": 60.0,
        "retry_on_status": [429, 500, 502, 503, 504],
    }
)
```

### 4. TypeScript SDK
Minimal viable TypeScript client matching Python SDK feature set. Published as `@sentinelai/sdk` on npm.

```typescript
class SentinelAIClient {
  constructor(config: { baseUrl: string; apiKey?: string; source?: string })
  async analyze(params: AnalyzeParams): Promise<AnalyzeResponse>
  async verify(params: VerifyParams): Promise<VerifyResponse>
  async correct(params: VerifyParams): Promise<string>
  async healthCheck(): Promise<boolean>
  async getRiskLogs(limit?: number): Promise<RiskLogEntry[]>
}
```
