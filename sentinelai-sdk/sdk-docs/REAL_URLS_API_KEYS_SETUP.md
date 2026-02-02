# 🚀 SentinelAI SDK - Real URLs & API Keys Setup Guide

## 🎯 Your Questions Answered

### "What URL should I put instead of hardcoded dummy URLs?"

**Answer:** Use your actual SentinelAI backend URL:

#### **Local Development:**
```python
base_url="http://localhost:8000"
```

#### **Production Deployment:**
```python
base_url="https://your-domain.com"
# Examples:
base_url="https://sentinelai.yourcompany.com"
base_url="https://ai-safety.yourcompany.com"
base_url="https://api.yourcompany.com"
```

#### **Environment Variables (Recommended):**
```python
base_url=os.getenv('SENTINELAI_URL', 'http://localhost:8000')
```

---

### "How can I create API keys?"

**Answer:** I've already generated secure API keys for you:

#### **Your Generated API Keys:**
- **API_KEY_1**: `uP51PCn!wyDYGaRA0H3V2z2IVBgC#W0A`
- **API_KEY_2**: `c*XKqdL@KkB%VyKIoupPPJisdtyVj0De`
- **API_KEY_3**: `WCE$CXyMq$zy&@7Q*YO8Pi34ui6#AO@K`

#### **How to Use Them:**
```python
api_key="uP51PCn!wyDYGaRA0H3V2z2IVBgC#W0A"
```

---

## 🔧 Complete Setup Instructions

### **Step 1: Set Up Environment Variables**

Create a `.env` file in your Backend directory:

```env
# Environment
ENVIRONMENT=development

# API Keys (use your generated keys)
SENTINELAI_API_KEYS=uP51PCn!wyDYGaRA0H3V2z2IVBgC#W0A,c*XKqdL@KkB%VyKIoupPPJisdtyVj0De,WCE$CXyMq$zy&@7Q*YO8Pi34ui6#AO@K

# Base URL
API_BASE_URL=http://localhost:8000

# Other settings
DATABASE_URL=sqlite:///./sentinel_ai.db
ALLOWED_ORIGINS=http://localhost:3000,https://yourdomain.com
SECRET_KEY=your-secret-key-here-change-in-production
```

### **Step 2: Start Your SentinelAI Backend**

```bash
cd D:\Sentinel-AI\Backend
python main.py
```

Your backend will be available at: `http://localhost:8000`

### **Step 3: Use Real Configuration in Your SDK**

#### **Option A: Direct Configuration**
```python
from sentinelai import SentinelAIClient

client = SentinelAIClient(
    base_url="http://localhost:8000",  # Your real SentinelAI URL
    api_key="uP51PCn!wyDYGaRA0H3V2z2IVBgC#W0A",  # Your real API key
    source="my-chatbot"
)
```

#### **Option B: Environment Variables (Recommended)**
```python
import os
from sentinelai import SentinelAIClient

client = SentinelAIClient(
    base_url=os.getenv('SENTINELAI_URL', 'http://localhost:8000'),
    api_key=os.getenv('SENTINELAI_API_KEY'),
    source=os.getenv('APP_NAME', 'my-chatbot')
)
```

#### **Option C: Production Configuration**
```python
# For production deployment
client = SentinelAIClient(
    base_url="https://sentinelai.yourcompany.com",  # Your production domain
    api_key="your-production-api-key",  # Your production API key
    source="production-chatbot"
)
```

---

## 🎯 Real-World Integration Example

### **Complete Production Chatbot Integration:**

```python
import os
from sentinelai import SentinelAIClient

class ProductionChatbot:
    def __init__(self):
        # Load configuration from environment
        self.client = SentinelAIClient(
            base_url=os.getenv('SENTINELAI_URL', 'http://localhost:8000'),
            api_key=os.getenv('SENTINELAI_API_KEY'),
            source=os.getenv('APP_NAME', 'production-chatbot')
        )
    
    def handle_message(self, user_id: str, session_id: str, message: str) -> str:
        """Handle a user message with AI safety monitoring."""
        try:
            # Generate AI response (your existing chatbot logic)
            ai_response = self.generate_response(message)
            
            # Analyze with SentinelAI
            result = self.client.analyze(
                prompt=message,
                response=ai_response,
                user_id=user_id,
                session_id=session_id,
                client_metadata={
                    "timestamp": "2024-02-02T20:19:00Z",
                    "message_length": len(message),
                    "response_length": len(ai_response)
                }
            )
            
            # Handle based on risk assessment
            decision = result['decision']
            risk_score = result['final_risk_score']
            
            if decision == 'block':
                print(f"🚫 BLOCKED: High risk content detected (Score: {risk_score:.3f})")
                return "I cannot assist with that request. Please contact our human support team."
            
            elif decision == 'warn':
                print(f"⚠️  WARNED: Content flagged for review (Score: {risk_score:.3f})")
                # Log for human review but deliver response
                self.log_for_review(result)
                return ai_response
            
            else:  # 'allow'
                print(f"✅ ALLOWED: Content is safe (Score: {risk_score:.3f})")
                return ai_response
                
        except Exception as e:
            print(f"❌ ERROR: {e}")
            # Fallback to safe response
            return "I'm having trouble processing your request. Please try again later."
    
    def generate_response(self, message: str) -> str:
        """Generate AI response (your existing chatbot logic)."""
        message_lower = message.lower()
        
        if "password" in message_lower and "reset" in message_lower:
            return "To reset your password, click the 'Forgot Password' link on the login page."
        elif "admin" in message_lower and ("access" in message_lower or "credentials" in message_lower):
            return "I cannot provide administrative access. Please contact your system administrator."
        elif "refund" in message_lower:
            return "We offer 30-day refunds for all products. Please visit our returns page."
        else:
            return "I understand your question. Let me help you with that."
    
    def log_for_review(self, result: dict):
        """Log flagged content for human review."""
        print(f"📋 LOGGED FOR REVIEW: {result}")

# Usage
chatbot = ProductionChatbot()

# Test messages
response = chatbot.handle_message(
    user_id="user_123",
    session_id="session_456", 
    message="What's your refund policy?"
)
print(f"Bot Response: {response}")
```

---

## 🔐 API Key Management

### **For Different Applications:**

```python
# Customer Support Bot
support_client = SentinelAIClient(
    base_url="http://localhost:8000",
    api_key="uP51PCn!wyDYGaRA0H3V2z2IVBgC#W0A",
    source="customer-support"
)

# Content Moderation System
moderation_client = SentinelAIClient(
    base_url="http://localhost:8000",
    api_key="c*XKqdL@KkB%VyKIoupPPJisdtyVj0De",
    source="content-moderation"
)

# AI Assistant
assistant_client = SentinelAIClient(
    base_url="http://localhost:8000",
    api_key="WCE$CXyMq$zy&@7Q*YO8Pi34ui6#AO@K",
    source="ai-assistant"
)
```

---

## 🌍 Deployment Options

### **Local Development:**
```python
base_url="http://localhost:8000"
api_key="uP51PCn!wyDYGaRA0H3V2z2IVBgC#W0A"
```

### **Staging Environment:**
```python
base_url="https://staging-sentinelai.yourcompany.com"
api_key="your-staging-api-key"
```

### **Production Environment:**
```python
base_url="https://sentinelai.yourcompany.com"
api_key="your-production-api-key"
```

---

## 📋 Environment Setup Checklist

### **✅ For Development:**
- [ ] Set `ENVIRONMENT=development`
- [ ] Use `http://localhost:8000` as base URL
- [ ] Use generated API keys
- [ ] Start backend with `python main.py`

### **✅ For Production:**
- [ ] Set `ENVIRONMENT=production`
- [ ] Use your production domain
- [ ] Generate new secure API keys
- [ ] Deploy backend to cloud server
- [ ] Set up HTTPS with SSL certificate
- [ ] Configure firewall and security

---

## 🎯 Summary

### **Real URLs:**
- **Local**: `http://localhost:8000`
- **Production**: `https://your-domain.com`

### **Real API Keys:**
- **Already Generated**: `uP51PCn!wyDYGaRA0H3V2z2IVBgC#W0A`
- **Environment Variable**: `SENTINELAI_API_KEYS`
- **Production**: Generate new secure keys

### **What You Need to Do:**
1. **Set up environment variables** with your generated API keys
2. **Start your SentinelAI backend** at the correct URL
3. **Use real configuration** in your SDK (no more dummy values)
4. **Deploy to production** when ready

Your SentinelAI SDK is now ready for real-world use with actual URLs and API keys! 🚀
