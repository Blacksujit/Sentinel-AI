# ðŸš€ SentinelAI Production Setup Guide

## Step 1: Environment Configuration

### Create your production environment file:
```bash
cd D:\Sentinel-AI\Backend
cp .env.example .env
```

### Update .env with your production values:
```env
ENVIRONMENT=production
SENTINELAI_API_KEYS=your-secure-api-key-1,your-secure-api-key-2
API_BASE_URL=https://your-domain.com
DATABASE_URL=sqlite:///./sentinel_ai.db
ALLOWED_ORIGINS=https://yourdomain.com,https://app.yourdomain.com
SECRET_KEY=your-super-secret-key-here
EXTERNAL_API_RATE_LIMIT=1000
```

## Step 2: Generate Secure API Keys

### Method 1: Generate random API keys
```python
import secrets
import string

def generate_api_key(length=32):
    chars = string.ascii_letters + string.digits + "!@#$%^&*"
    return ''.join(secrets.choice(chars) for _ in range(length))

# Generate 3 API keys
for i in range(3):
    print(f"API_KEY_{i+1}: {generate_api_key()}")
```

### Method 2: Use online generator
- Visit: https://randomkeygen.com/
- Generate 32-character random strings
- Include letters, numbers, and special characters

## Step 3: Update Your SDK Configuration

### For External Developers:

**Development (Local):**
```python
from sentinelai import SentinelAIClient

client = SentinelAIClient(
    base_url="http://localhost:8000",  # Your local SentinelAI
    api_key="dev-key-12345",  # Your dev API key
    source="my-chatbot"
)
```

**Production:**
```python
from sentinelai import SentinelAIClient

client = SentinelAIClient(
    base_url="https://sentinelai.yourcompany.com",  # Your production URL
    api_key="your-secure-api-key-1",  # Your production API key
    source="production-chatbot"
)
```

**Environment Variables (Recommended):**
```python
import os
from sentinelai import SentinelAIClient

client = SentinelAIClient(
    base_url=os.getenv('SENTINELAI_URL'),
    api_key=os.getenv('SENTINELAI_API_KEY'),
    source=os.getenv('APP_NAME')
)
```

## Step 4: Deploy Your SentinelAI

### Option A: Local Development
```bash
# Start your backend
cd D:\Sentinel-AI\Backend
python main.py

# Your API will be available at:
# http://localhost:8000
# External API: http://localhost:8000/api/analyze/external
```

### Option B: Cloud Deployment

#### Deploy to VPS/Dedicated Server:
```bash
# 1. Install dependencies
pip install -r requirements.txt

# 2. Set environment variables
export ENVIRONMENT=production
export SENTINELAI_API_KEYS="your-secure-api-key-1,your-secure-api-key-2"
export API_BASE_URL="https://your-domain.com"

# 3. Start with Gunicorn
gunicorn main:app --host 0.0.0.0 --port 8000

# 4. Set up reverse proxy (nginx/apache) for HTTPS
```

#### Deploy to Cloud Platform:
- **AWS EC2**: Use Amazon Linux 2, install Python, deploy with Gunicorn
- **DigitalOcean**: Use Ubuntu, install Python, deploy with Docker
- **Heroku**: Use Heroku Python buildpack
- **Azure**: Use Azure App Service for Linux

## Step 5: Test Your Production API

### Test the external endpoint:
```bash
curl -X POST "https://your-domain.com/api/analyze/external" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-secure-api-key-1" \
  -d '{
    "prompt": "Hello, how are you?",
    "response": "I am doing well, thank you!",
    "source": "test-client",
    "user_id": "test_user_123",
    "session_id": "test_session_456"
  }'
```

### Expected Response:
```json
{
  "final_risk_score": 0.1,
  "flags": [],
  "confidence": 1.0,
  "decision": "allow",
  "action_taken": "allow",
  "decision_reason": "Score 0.10 < warn_threshold 0.30 - allowed"
}
```

## Step 6: Share with External Developers

### Provide developers with:
1. **API Documentation**: Share your API documentation
2. **API Keys**: Generate unique API keys for each developer
3. **Base URL**: Your production SentinelAI URL
4. **SDK Installation**: `pip install sentinelai-risk`

### Example Integration Code to Share:
```python
# Installation
pip install --index-url https://test.pypi.org/simple/ sentinelai-risk

# Integration
from sentinelai import SentinelAIClient
import os

# Initialize client
client = SentinelAIClient(
    base_url="https://sentinelai.yourcompany.com",
    api_key=os.getenv('SENTINELAI_API_KEY'),
    source="my-chatbot-app"
)

# Analyze interaction
result = client.analyze(
    prompt="User message here",
    response="AI response here", 
    user_id="user_123",
    session_id="session_456"
)

# Handle risk decision
if result['decision'] == 'block':
    return "I cannot help with that request."
elif result['decision'] == 'warn':
    log_for_review(result)
    return original_response
else:
    return original_response
```

## ðŸ” Security Best Practices

1. **Use HTTPS**: Always use HTTPS in production
2. **Rotate API Keys**: Change API keys regularly
3. **Rate Limiting**: Set appropriate rate limits
4. **Monitor Usage**: Track API usage and unusual patterns
5. **IP Whitelisting**: Consider IP restrictions for sensitive APIs
6. **Audit Logs**: Keep audit logs of API access

## ðŸ“ž Support

For production deployment issues:
- Check logs: `tail -f logs/app.log`
- Verify API keys: Test with curl
- Check database: Ensure database is accessible
- Monitor performance: Use monitoring tools
