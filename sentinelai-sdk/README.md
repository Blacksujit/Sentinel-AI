# SentinelAI Python SDK

Official Python SDK for integrating applications with SentinelAI AI safety platform.

## 🚀 Quick Start

### Installation

```bash
pip install sentinelai-sdk
```

### Quick Start with Render Backend

```python
from sentinelai import SentinelAIClient

# Initialize client with your Render backend
client = SentinelAIClient(
    base_url="https://sentinel-ai-dml3.onrender.com",  # Your Render backend URL
    source="my-chatbot-app"
)

# Analyze interaction
result = client.analyze(
    prompt="User message here",
    response="AI response here",
    user_id="user123",
    session_id="session456"
)

# Handle based on risk assessment
if result['decision'] == 'block':
    print("🚫 Response blocked - high risk!")
elif result['decision'] == 'warn':
    print("⚠️ Response flagged for review")
else:
    print("✅ Response is safe")
```

## 📋 Features

- ✅ **Real-time AI Safety Analysis** - Analyze prompt/response pairs instantly
- ✅ **One-shot Verification** - Verify and correct responses with a single call
- ✅ **Hallucination Detection** - Score (0-100), claims, and auto-correction
- ✅ **Risk-based Decision Making** - Get allow/warn/block/escalate decisions
- ✅ **Multi-turn Conversation Tracking** - Track entire conversations
- ✅ **Production-ready** - Built-in retries, timeouts, and error handling
- ✅ **Comprehensive Logging** - Full audit trail for compliance
- ✅ **Easy Integration** - Just 3 lines of code to get started

## 🎯 Use Cases

- **Customer Support Chatbots** - Monitor customer interactions
- **Content Moderation** - Automatically moderate user-generated content
- **AI Assistant Safety** - Ensure AI responses are safe and appropriate
- **Compliance Monitoring** - Meet regulatory requirements for AI safety
- **Multi-application Management** - Monitor multiple AI applications from one dashboard

## 📚 Documentation

Full documentation available at: [SentinelAI SDK Documentation](https://github.com/Blacksujit/Sentinel-AI/tree/main/Docs)

## 🔧 Installation

### From PyPI (Recommended)

```bash
pip install sentinelai-sdk
```

### From Source

```bash
git clone https://github.com/Blacksujit/Sentinel-AI.git
cd Sentinel-AI/sentinelai-sdk
pip install -e .
```

## 🚀 Getting Started

### 1. Initialize Client with Render Backend

```python
from sentinelai import SentinelAIClient

# For development (no API key required)
client = SentinelAIClient(
    base_url="https://sentinel-ai-dml3.onrender.com",
    source="my-application"
)

# For production (with API key)
client = SentinelAIClient(
    base_url="https://sentinel-ai-dml3.onrender.com",
    api_key="your-production-api-key",
    source="production-app"
)
```

### 2. API Endpoints Available

The SDK automatically connects to these Render backend endpoints:

| Endpoint | Purpose | SDK Method |
|----------|---------|------------|
| `POST /api/analyze/external` | Analyze prompt/response pairs | `client.analyze()` |
| `POST /api/analyze/external` | One-shot verify (score 0-100, status, claims) | `client.verify()` |
| `POST /api/analyze/external` | Verify and return corrected text | `client.correct()` |
| `GET /api/health` | Check backend health | `client.health_check()` |
| `GET /api/logs` | Retrieve risk logs | `client.get_risk_logs()` |
| `GET /api/settings` | Get current settings | `client.get_settings()` |
| `POST /api/settings/reset` | Reset to defaults | `client.reset_settings()` |

### 3. Analyze Interactions

```python
result = client.analyze(
    prompt="User's question or message",
    response="AI model's response",
    user_id="unique-user-id",
    session_id="session-identifier"
)
```

### 3. Handle Risk Decisions

```python
decision = result['decision']
risk_score = result['final_risk_score']

if decision == 'allow':
    # Safe to deliver
    return ai_response
elif decision == 'warn':
    # Flag for review but deliver
    log_for_review(result)
    return ai_response
elif decision == 'block':
    # Block the response
    return safe_fallback_response()
elif decision == 'escalate':
    # High priority escalation
    notify_administrators(result)
    return emergency_fallback_response()
```

## ✅ One-Shot Verification

The `verify()` method provides a simplified, single-call interface that returns a score (0-100), status classification, detected claims, and a corrected version.

```python
# Verify a response for accuracy and safety
result = client.verify(
    prompt="Who won the Nobel Prize in Physics in 2019?",
    response="It was awarded entirely to Stephen Hawking for his work on black holes.",
)

# Check result
print(result['score'])        # 0-100 risk score
print(result['status'])       # 'trusted', 'needs_review', or 'hallucinated'
print(result['corrected'])    # Corrected text if hallucinated, otherwise None
print(result['claims'])       # List of flagged claims with detector info
```

### Verify Response Format

```python
{
    "score": 91,                    # Risk score (0-100)
    "status": "hallucinated",       # 'trusted', 'needs_review', or 'hallucinated'
    "decision": "block",            # Backend decision
    "action_taken": "block",        # Action taken
    "claims": [                      # Detected issues
        {
            "detector": "Unsafe Output",
            "text": "Stephen Hawking won it...",
            "severity": "high",
            "source": "response",
            "note": "Flagged by Unsafe Output detector"
        }
    ],
    "corrected": "The 2019 Nobel Prize in Physics...",        # Auto-corrected text
    "meta": {
        "claims_checked": 1,
        "detectors_run": 6,
        "verified_at": "2026-07-16T12:00:00Z"
    }
}
```

### Correct Method

For cases where you only want the corrected response:

```python
corrected = client.correct(
    prompt="Who won the 2019 Nobel Prize?",
    response="Stephen Hawking won it posthumously.",
)
# Returns corrected text if needed, otherwise the original response
```

## 📊 Risk Assessment

The SDK provides detailed risk analysis:

```python
{
    "final_risk_score": 0.8,           # Risk score (0.0 to 1.0)
    "decision": "warn",                # 'allow', 'warn', 'block', 'escalate'
    "flags": ["privacy_violation"],    # Detected risk flags
    "confidence": 1.0,                 # Analysis confidence
    "action_taken": "warn",            # Recommended action
    "decision_reason": "Score 0.80...", # Explanation
    "settings_version": 47,            # Settings version used
    "thresholds_applied": {            # Risk thresholds
        "warn_threshold": 0.3,
        "escalate_threshold": 0.7,
        "confidence_floor": 0.5
    }
}
```

## 🔄 Conversation Tracking

For multi-turn conversations:

```python
from sentinelai import ConversationTracker

# Initialize tracker
tracker = ConversationTracker(client, "user_session_123")

# Add conversation turns
tracker.add_turn("Hello", "Hi! How can I help you?", user_id="user123")
tracker.add_turn("What's your refund policy?", "We offer 30-day refunds...", user_id="user123")

# Get conversation summary
summary = tracker.get_summary()
print(f"Average risk score: {summary['risk_statistics']['average_risk_score']:.3f}")
```

## 🔒 Security & Authentication

### Getting an API Key

SentinelAI API keys are generated from the SentinelAI Console:

- Console: https://sentinel-ai-hazel.vercel.app
- API Keys page: https://sentinel-ai-hazel.vercel.app/api-keys

Copy the generated key **once** and store it securely (for example in a secrets manager or environment variable).

### API Key Authentication

```python
client = SentinelAIClient(
    base_url="https://sentinel-ai-dml3.onrender.com",
    api_key="your-production-api-key",
    source="production-app"
)
```

### Environment Variables

```bash
export SENTINELAI_URL="https://sentinel-ai-dml3.onrender.com"
export SENTINELAI_API_KEY="your-api-key"
export SENTINELAI_SOURCE="my-application"
```

### HTTP Header Used

The SDK sends the API key using:

- `Authorization: Bearer <api_key>`

The backend also supports `X-API-Key: <api_key>` if you want to integrate without the SDK.

```python
import os
from sentinelai import SentinelAIClient

client = SentinelAIClient(
    base_url=os.getenv('SENTINELAI_URL'),
    api_key=os.getenv('SENTINELAI_API_KEY'),
    source=os.getenv('SENTINELAI_SOURCE')
)
```

## 🚨 Error Handling

The SDK provides comprehensive error handling:

```python
from sentinelai import SentinelAIClient, SentinelAIError, SentinelAIConnectionError

try:
    result = client.analyze(prompt, response, user_id, session_id)
    
except SentinelAIAuthenticationError:
    print("❌ Invalid API key")
    
except SentinelAIConnectionError:
    print("🔴 Cannot connect to SentinelAI")
    # Implement fallback behavior
    
except SentinelAIError as e:
    print(f"⚠️ SentinelAI error: {e}")
```

## 📈 Monitoring & Health Checks

```python
# Health check
if client.health_check():
    print("✅ SentinelAI is healthy")
else:
    print("❌ SentinelAI is down")

# Get recent logs
logs = client.get_risk_logs(limit=100, source="my-app")

# Analyze patterns
high_risk_count = len([log for log in logs if log['final_risk_score'] > 0.7])
print(f"High risk interactions: {high_risk_count}")
```

## 🎯 Integration Examples

### Customer Support Chatbot

```python
class SupportChatbot:
    def __init__(self):
        self.client = SentinelAIClient(
            base_url="https://sentinel-ai-dml3.onrender.com",
            source="customer-support"
        )
    
    def handle_message(self, user_id: str, message: str) -> str:
        # Generate AI response
        ai_response = self.generate_response(message)
        
        # Analyze with SentinelAI
        result = self.client.analyze(
            prompt=message,
            response=ai_response,
            user_id=user_id,
            session_id=f"support_{user_id}"
        )
        
        # Handle based on risk
        if result['decision'] == 'block':
            return "I cannot assist with that request."
        
        return ai_response
```

### Content Moderation

```python
class ContentModerator:
    def __init__(self):
        self.client = SentinelAIClient(
            base_url="https://sentinel-ai-dml3.onrender.com",
            source="content-moderation"
        )
    
    def moderate_content(self, user_id: str, content: str) -> bool:
        result = self.client.analyze(
            prompt=content,
            response="User generated content",
            user_id=user_id
        )
        
        return result['decision'] in ['allow', 'warn']
```

## 🔧 Advanced Configuration

```python
client = SentinelAIClient(
    base_url="https://sentinel-ai-dml3.onrender.com",
    api_key="your-api-key",
    source="advanced-app",
    timeout=15,           # Request timeout
    max_retries=3,       # Retry attempts
    retry_delay=1.0       # Delay between retries
)
```

## 📦 Requirements

- Python 3.8+
- requests >= 2.25.0

## 🧪 Testing

```bash
# Run tests
pip install -e ".[dev]"
pytest

# Run with coverage
pytest --cov=sentinelai
```

## 📄 License

MIT License - see LICENSE file for details.

## 🆘 Support

- **Documentation**: [Full Documentation](https://github.com/Blacksujit/Sentinel-AI/tree/main/Docs)
- **Issues**: [GitHub Issues](https://github.com/Blacksujit/Sentinel-AI/issues)
 

## 🔄 Changelog

### v1.1.0
- One-shot `verify()` method - simplified API with score (0-100), status (trusted/needs_review/hallucinated), claims[], and corrected text
- `correct()` method - returns corrected response directly
- Fixed Python 3.14 deprecation warnings (datetime.utcnow → datetime.now(timezone.utc))

### v1.0.0
- Initial release
- Real-time AI safety analysis (analyze method)
- Conversation tracking
- Production-ready error handling
- Comprehensive documentation

---

**Ready to make your AI applications safer?** Install the SDK and get started in minutes! 🚀
