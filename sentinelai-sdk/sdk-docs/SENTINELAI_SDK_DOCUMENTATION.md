# SentinelAI Python SDK Documentation

## 🚀 Quick Start

### Installation

```bash
# Install the SDK
pip install sentinelai-sdk

# Or copy the sentinelai_sdk.py file to your project
```

### Basic Usage

```python
from sentinelai import SentinelAIClient

# Initialize client
client = SentinelAIClient(
    base_url="https://your-sentinelai.com",
    api_key="your-api-key",  # Optional for development
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

---

## 📋 API Reference

### SentinelAIClient Class

#### Constructor

```python
SentinelAIClient(
    base_url: str,
    api_key: Optional[str] = None,
    source: str = "python-sdk",
    timeout: int = 10,
    max_retries: int = 3,
    retry_delay: float = 1.0
)
```

**Parameters:**
- `base_url` (str): Base URL of your SentinelAI instance
- `api_key` (str, optional): API key for authentication
- `source` (str): Identifier for your application
- `timeout` (int): Request timeout in seconds (default: 10)
- `max_retries` (int): Maximum retry attempts (default: 3)
- `retry_delay` (float): Delay between retries (default: 1.0)

#### Methods

##### analyze()

```python
analyze(
    prompt: str,
    response: str,
    user_id: Optional[str] = None,
    session_id: Optional[str] = None,
    client_metadata: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]
```

Analyze a prompt/response pair for AI safety risks.

**Parameters:**
- `prompt` (str): User's prompt or question
- `response` (str): AI model's response
- `user_id` (str, optional): End user identifier
- `session_id` (str, optional): Session identifier for tracking
- `client_metadata` (dict, optional): Additional metadata

**Returns:**
```python
{
    "final_risk_score": 0.8,           # Risk score (0.0 to 1.0)
    "decision": "warn",                # 'allow', 'warn', 'block', 'escalate'
    "flags": ["privacy_violation"],    # Detected risk flags
    "confidence": 1.0,                 # Analysis confidence
    "action_taken": "warn",            # Action taken
    "decision_reason": "Score 0.80...", # Explanation
    "settings_version": 47,            # Settings version used
    "thresholds_applied": {            # Risk thresholds
        "warn_threshold": 0.3,
        "escalate_threshold": 0.7,
        "confidence_floor": 0.5
    },
    "analysis_id": 123,               # Analysis ID for tracking
    "timestamp": "2026-02-02T09:27:29" # Analysis timestamp
}
```

**Example:**
```python
result = client.analyze(
    prompt="Can you give me admin access?",
    response="Here are the admin credentials...",
    user_id="user123",
    session_id="session456",
    client_metadata={
        "user_type": "premium",
        "conversation_context": "support"
    }
)

if result['decision'] == 'block':
    # Block the response
    return "I cannot provide that information."
elif result['decision'] == 'warn':
    # Log for review but deliver
    log_for_review(result)
    return response
else:
    # Safe to deliver
    return response
```

##### health_check()

```python
health_check() -> bool
```

Check if the SentinelAI API is healthy and accessible.

**Returns:**
- `True` if API is healthy
- `False` if API is down or unreachable

**Example:**
```python
if not client.health_check():
    print("⚠️ SentinelAI is down - using fallback mode")
    # Implement fallback behavior
```

##### get_risk_logs()

```python
get_risk_logs(limit: int = 50, source: Optional[str] = None) -> List[Dict[str, Any]]
```

Get recent risk analysis logs from SentinelAI.

**Parameters:**
- `limit` (int): Maximum number of logs to return
- `source` (str, optional): Filter by specific source

**Returns:**
List of risk log entries with full analysis data.

**Example:**
```python
# Get recent logs for your application
logs = client.get_risk_logs(limit=100, source="my-chatbot")

# Analyze risk patterns
high_risk_count = len([log for log in logs if log['final_risk_score'] > 0.7])
print(f"High risk interactions: {high_risk_count}")
```

##### get_settings()

```python
get_settings() -> Dict[str, Any]
```

Get current SentinelAI settings configuration.

**Returns:**
Current settings including thresholds and enforcement mode.

---

### ConversationTracker Class

Track multi-turn conversations with risk analysis.

#### Constructor

```python
ConversationTracker(client: SentinelAIClient, session_id: str)
```

#### Methods

##### add_turn()

```python
add_turn(
    prompt: str,
    response: str,
    user_id: Optional[str] = None,
    turn_metadata: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]
```

Add a conversation turn with automatic analysis.

##### get_summary()

```python
get_summary() -> Dict[str, Any]
```

Get conversation summary with risk statistics.

**Example:**
```python
# Initialize conversation tracker
tracker = ConversationTracker(client, "user_session_123")

# Add conversation turns
tracker.add_turn("Hello", "Hi! How can I help you?", user_id="user123")
tracker.add_turn("What's your refund policy?", "We offer 30-day refunds...", user_id="user123")

# Get conversation summary
summary = tracker.get_summary()
print(f"Average risk score: {summary['risk_statistics']['average_risk_score']:.3f}")
print(f"Total turns: {summary['total_turns']}")
```

---

## 🎯 Integration Examples

### Example 1: Customer Support Chatbot

```python
from sentinelai import SentinelAIClient

class SupportChatbot:
    def __init__(self):
        self.client = SentinelAIClient(
            base_url="https://sentinelai.company.com",
            api_key="your-api-key",
            source="customer-support-chatbot"
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
        elif result['decision'] == 'warn':
            # Log for human review
            self.log_for_review(result, user_id)
            return ai_response
        else:
            return ai_response
    
    def generate_response(self, message: str) -> str:
        # Your existing AI logic here
        return "AI generated response"
    
    def log_for_review(self, result: dict, user_id: str):
        # Send to human review system
        pass

# Usage
chatbot = SupportChatbot()
response = chatbot.handle_message("user123", "How do I reset my password?")
```

### Example 2: Content Moderation System

```python
from sentinelai import SentinelAIClient

class ContentModerator:
    def __init__(self):
        self.client = SentinelAIClient(
            base_url="https://sentinelai.company.com",
            source="content-moderation"
        )
    
    def moderate_content(self, user_id: str, content: str) -> bool:
        """
        Moderate user-generated content.
        
        Returns True if content is safe, False if it should be blocked.
        """
        result = self.client.analyze(
            prompt=content,
            response="User generated content",
            user_id=user_id,
            client_metadata={
                "content_type": "user_post",
                "moderation_context": "public_forum"
            }
        )
        
        return result['decision'] in ['allow', 'warn']
    
    def batch_moderate(self, contents: List[tuple]) -> List[bool]:
        """
        Moderate multiple pieces of content.
        
        Args:
            contents: List of (user_id, content) tuples
        
        Returns:
            List of booleans indicating if each content is safe
        """
        results = []
        for user_id, content in contents:
            is_safe = self.moderate_content(user_id, content)
            results.append(is_safe)
        return results

# Usage
moderator = ContentModerator()
is_safe = moderator.moderate_content("user123", "This is a user post...")
```

### Example 3: Multi-Turn Conversation Tracking

```python
from sentinelai import SentinelAIClient, ConversationTracker

class AdvancedChatbot:
    def __init__(self):
        self.client = SentinelAIClient(
            base_url="https://sentinelai.company.com",
            source="advanced-chatbot"
        )
        self.sessions = {}
    
    def handle_message(self, user_id: str, session_id: str, message: str) -> str:
        # Get or create conversation tracker
        if session_id not in self.sessions:
            self.sessions[session_id] = ConversationTracker(self.client, session_id)
        
        tracker = self.sessions[session_id]
        
        # Generate response
        response = self.generate_response(message)
        
        # Add turn with analysis
        result = tracker.add_turn(
            prompt=message,
            response=response,
            user_id=user_id,
            turn_metadata={
                "message_length": len(message),
                "response_length": len(response)
            }
        )
        
        # Handle risk
        if result['decision'] == 'block':
            return "I cannot help with that."
        
        return response
    
    def get_session_summary(self, session_id: str) -> dict:
        """Get risk summary for a conversation session."""
        if session_id in self.sessions:
            return self.sessions[session_id].get_summary()
        return {"error": "Session not found"}
    
    def generate_response(self, message: str) -> str:
        # Your AI logic
        return "AI response"

# Usage
chatbot = AdvancedChatbot()
response = chatbot.handle_message("user123", "session_456", "Hello!")
summary = chatbot.get_session_summary("session_456")
print(f"Session risk: {summary['risk_statistics']['average_risk_score']:.3f}")
```

---

## 🔧 Configuration

### Environment Variables

```bash
# SentinelAI configuration
export SENTINELAI_URL="https://sentinelai.company.com"
export SENTINELAI_API_KEY="your-api-key"
export SENTINELAI_SOURCE="my-application"
export SENTINELAI_TIMEOUT="10"
```

### Configuration in Code

```python
import os
from sentinelai import SentinelAIClient

# Load from environment
client = SentinelAIClient(
    base_url=os.getenv('SENTINELAI_URL', 'http://localhost:8000'),
    api_key=os.getenv('SENTINELAI_API_KEY'),
    source=os.getenv('SENTINELAI_SOURCE', 'my-app'),
    timeout=int(os.getenv('SENTINELAI_TIMEOUT', '10'))
)
```

---

## 🚨 Error Handling

### Exception Types

- `SentinelAIError`: Base exception for all SDK errors
- `SentinelAIConnectionError`: Connection-related errors
- `SentinelAIAuthenticationError`: Authentication errors

### Error Handling Best Practices

```python
from sentinelai import SentinelAIClient, SentinelAIError, SentinelAIConnectionError

client = SentinelAIClient(base_url="https://sentinelai.company.com")

try:
    result = client.analyze(prompt, response, user_id, session_id)
    
except SentinelAIAuthenticationError:
    print("❌ Invalid API key - check your credentials")
    
except SentinelAIConnectionError:
    print("🔴 Cannot connect to SentinelAI - check network")
    # Implement fallback behavior
    return safe_fallback_response()
    
except SentinelAIError as e:
    print(f"⚠️ SentinelAI error: {e}")
    # Log error and proceed with caution
    return response_with_warning()
```

### Fallback Behavior

The SDK automatically provides safe fallbacks for production use:

```python
result = client.analyze(prompt, response, user_id, session_id)

if result.get('fallback'):
    # SentinelAI was unavailable - fallback used
    print("⚠️ Using fallback mode - SentinelAI unavailable")
    # Implement your fallback logic here
```

---

## 📊 Monitoring & Analytics

### Health Monitoring

```python
# Regular health checks
import asyncio

async def monitor_sentinelai():
    client = SentinelAIClient(base_url="https://sentinelai.company.com")
    
    while True:
        if not client.health_check():
            # Send alert to monitoring system
            alert_service.send_alert("SentinelAI down", severity="high")
        
        await asyncio.sleep(60)  # Check every minute
```

### Risk Analytics

```python
# Analyze risk patterns
logs = client.get_risk_logs(limit=1000, source="my-chatbot")

# Calculate statistics
total_logs = len(logs)
high_risk = len([log for log in logs if log['final_risk_score'] > 0.7])
blocked = len([log for log in logs if log['decision'] == 'block'])

print(f"Total interactions: {total_logs}")
print(f"High risk rate: {high_risk/total_logs*100:.1f}%")
print(f"Block rate: {blocked/total_logs*100:.1f}%")

# Risk distribution
decisions = [log['decision'] for log in logs]
decision_counts = {
    'allow': decisions.count('allow'),
    'warn': decisions.count('warn'),
    'block': decisions.count('block'),
    'escalate': decisions.count('escalate')
}
```

---

## 🔒 Security Best Practices

### API Key Management

```python
# Use environment variables for API keys
import os

api_key = os.getenv('SENTINELAI_API_KEY')
if not api_key:
    raise ValueError("SENTINELAI_API_KEY environment variable required")

client = SentinelAIClient(
    base_url="https://sentinelai.company.com",
    api_key=api_key
)
```

### Data Privacy

```python
# Avoid sending sensitive PII in metadata
result = client.analyze(
    prompt=user_message,
    response=ai_response,
    user_id=user_hash,  # Use hashed IDs instead of real IDs
    session_id=session_hash,  # Hash session identifiers
    client_metadata={
        "user_type": "premium",  # Safe metadata only
        "version": "1.0.0"
        # Avoid: name, email, phone, address
    }
)
```

### Request Validation

```python
def safe_analyze(client, prompt, response, **kwargs):
    """Validate inputs before sending to SentinelAI."""
    
    # Input validation
    if not prompt or not response:
        raise ValueError("Prompt and response are required")
    
    if len(prompt) > 10000 or len(response) > 10000:
        raise ValueError("Content too long")
    
    # Sanitize inputs
    prompt = prompt.strip()[:10000]
    response = response.strip()[:10000]
    
    return client.analyze(prompt, response, **kwargs)
```

---

## 🚀 Deployment

### Production Deployment

```python
# Production configuration
import os
from sentinelai import SentinelAIClient

def create_production_client():
    return SentinelAIClient(
        base_url=os.getenv('SENTINELAI_URL'),
        api_key=os.getenv('SENTINELAI_API_KEY'),
        source=os.getenv('APP_NAME', 'production-app'),
        timeout=5,  # Shorter timeout for production
        max_retries=2,  # Fewer retries for faster failure
        retry_delay=0.5
    )

# Usage in production
client = create_production_client()
```

### Docker Integration

```dockerfile
# Dockerfile
FROM python:3.11-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt

COPY sentinelai_sdk.py .
COPY your_app.py .

EXPOSE 5000
CMD ["python", "your_app.py"]
```

```yaml
# docker-compose.yml
version: '3.8'
services:
  your-app:
    build: .
    environment:
      - SENTINELAI_URL=https://sentinelai.company.com
      - SENTINELAI_API_KEY=${API_KEY}
    depends_on:
      - sentinelai
```

---

## 📝 Quick Reference

### Essential Code Snippets

```python
# Basic initialization
from sentinelai import SentinelAIClient
client = SentinelAIClient(base_url="https://sentinelai.company.com")

# Quick analysis
result = client.analyze("User message", "AI response")

# Risk-based decision
if result['decision'] == 'block':
    return "I cannot help with that."

# Conversation tracking
from sentinelai import ConversationTracker
tracker = ConversationTracker(client, "session123")
tracker.add_turn("Hello", "Hi there!")

# Health check
if client.health_check():
    print("✅ SentinelAI is healthy")
```

### Decision Types

- **`allow`** - Safe to deliver (risk < 0.3)
- **`warn`** - Flagged for review (0.3 ≤ risk < 0.7)
- **`block`** - Blocked content (0.7 ≤ risk < 0.85)
- **`escalate`** - High priority escalation (risk ≥ 0.85)

### Risk Score Interpretation

- **0.0 - 0.3**: Low risk - Safe to deliver
- **0.3 - 0.7**: Medium risk - Flag for review
- **0.7 - 0.85**: High risk - Consider blocking
- **0.85 - 1.0**: Critical risk - Block immediately

---

## 🆘 Support

- **Documentation**: Complete guide available
- **Examples**: See integration examples above
- **Issues**: Report via GitHub issues
- **Email**: support@sentinelai.com
- **Dashboard**: Monitor at your SentinelAI instance

---

## 📄 License

SentinelAI Python SDK © 2026 SentinelAI Team. All rights reserved.

---

**Ready to integrate?** Start with the basic usage example and scale up as needed! 🚀
