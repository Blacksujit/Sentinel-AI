"""
🚀 REAL PRODUCTION INTEGRATION EXAMPLE
This shows how to use real URLs and API keys with your SentinelAI SDK
"""

import os
from sentinelai import SentinelAIClient

# ========================================
# OPTION 1: Local Development
# ========================================
print("🔧 LOCAL DEVELOPMENT SETUP")
print("=" * 40)

local_client = SentinelAIClient(
    base_url="http://localhost:8000",  # Your local SentinelAI backend
    api_key="uP51PCn!wyDYGaRA0H3V2z2IVBgC#W0A",  # Your generated API key
    source="local-chatbot"
)

# Test local integration
try:
    result = local_client.analyze(
        prompt="Hello, how are you today?",
        response="I'm doing great, thanks for asking!",
        user_id="local_user_123",
        session_id="local_session_456"
    )
    print("✅ Local test successful!")
    print(f"   Risk Score: {result.get('final_risk_score', 0):.3f}")
    print(f"   Decision: {result.get('decision', 'unknown')}")
except Exception as e:
    print(f"❌ Local test failed: {e}")

print()

# ========================================
# OPTION 2: Environment Variables (Recommended)
# ========================================
print("🌍 ENVIRONMENT VARIABLES SETUP")
print("=" * 40)

# Set environment variables (normally done via .env file)
os.environ['SENTINELAI_URL'] = "http://localhost:8000"
os.environ['SENTINELAI_API_KEY'] = "uP51PCn!wyDYGaRA0H3V2z2IVBgC#W0A"
os.environ['APP_NAME'] = "env-chatbot"

env_client = SentinelAIClient(
    base_url=os.getenv('SENTINELAI_URL'),
    api_key=os.getenv('SENTINELAI_API_KEY'),
    source=os.getenv('APP_NAME')
)

# Test environment variable integration
try:
    result = env_client.analyze(
        prompt="What's your refund policy?",
        response="We offer 30-day refunds for all products.",
        user_id="env_user_789",
        session_id="env_session_012"
    )
    print("✅ Environment variables test successful!")
    print(f"   Risk Score: {result.get('final_risk_score', 0):.3f}")
    print(f"   Decision: {result.get('decision', 'unknown')}")
except Exception as e:
    print(f"❌ Environment test failed: {e}")

print()

# ========================================
# OPTION 3: Production Setup Example
# ========================================
print("🚀 PRODUCTION SETUP EXAMPLE")
print("=" * 40)

# This is what external developers would use in production
production_config = """
# Production environment variables
SENTINELAI_URL=https://sentinelai.yourcompany.com
SENTINELAI_API_KEY=your-production-api-key-here
APP_NAME=production-chatbot
"""

print("📝 Production .env file would contain:")
print(production_config)

# Example production client (commented out for now)
"""
production_client = SentinelAIClient(
    base_url="https://sentinelai.yourcompany.com",
    api_key="your-production-api-key-here",
    source="production-chatbot"
)
"""

print("🔧 Production client would be configured with:")
print("   - Base URL: https://sentinelai.yourcompany.com")
print("   - API Key: Your secure production API key")
print("   - Source: production-chatbot")

print()

# ========================================
# OPTION 4: Multiple Client Setup
# ========================================
print("🔄 MULTIPLE CLIENT SETUP")
print("=" * 40)

# Different applications can use different API keys
clients = {
    "customer-support": SentinelAIClient(
        base_url="http://localhost:8000",
        api_key="uP51PCn!wyDYGaRA0H3V2z2IVBgC#W0A",
        source="customer-support"
    ),
    "content-moderation": SentinelAIClient(
        base_url="http://localhost:8000",
        api_key="c*XKqdL@KkB%VyKIoupPPJisdtyVj0De",
        source="content-moderation"
    ),
    "ai-assistant": SentinelAIClient(
        base_url="http://localhost:8000",
        api_key="WCE$CXyMq$zy&@7Q*YO8Pi34ui6#AO@K",
        source="ai-assistant"
    )
}

# Test each client
for name, client in clients.items():
    try:
        result = client.analyze(
            prompt=f"Test message from {name}",
            response=f"Test response from {name}",
            user_id=f"{name}_user",
            session_id=f"{name}_session"
        )
        print(f"✅ {name}: Risk={result.get('final_risk_score', 0):.3f}, Decision={result.get('decision', 'unknown')}")
    except Exception as e:
        print(f"❌ {name}: Failed - {e}")

print()

# ========================================
# OPTION 5: Error Handling & Fallbacks
# ========================================
print("🛡️ ERROR HANDLING EXAMPLE")
print("=" * 40)

try:
    # This would fail with wrong API key
    bad_client = SentinelAIClient(
        base_url="http://localhost:8000",
        api_key="wrong-api-key",
        source="test-client"
    )
    
    result = bad_client.analyze(
        prompt="Test message",
        response="Test response"
    )
    
except Exception as e:
    print(f"🚨 Expected error with wrong API key: {e}")
    
    # Fallback behavior for production
    print("🔄 Implementing fallback behavior...")
    
    # In production, you might:
    # 1. Log the error for monitoring
    # 2. Return a safe response
    # 3. Try a backup API key
    # 4. Gracefully degrade functionality
    
    fallback_response = {
        "decision": "allow",
        "final_risk_score": 0.0,
        "error": str(e),
        "fallback": True,
        "message": "AI safety check temporarily unavailable"
    }
    print(f"📊 Fallback response: {fallback_response}")

print()

# ========================================
# 🎯 REAL-WORLD INTEGRATION EXAMPLE
# ========================================
print("🎯 REAL-WORLD CHATBOT INTEGRATION")
print("=" * 40)

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

# Test the production chatbot
chatbot = ProductionChatbot()

# Test messages
test_messages = [
    ("user_123", "session_456", "What's your refund policy?"),
    ("user_789", "session_012", "Can you give me admin access?"),
    ("user_111", "session_333", "Hello, how are you today?")
]

for user_id, session_id, message in test_messages:
    print(f"\n👤 User {user_id}: {message}")
    response = chatbot.handle_message(user_id, session_id, message)
    print(f"🤖️ Bot: {response}")

print("\n🎉 INTEGRATION COMPLETE!")
print("=" * 50)
print("Your SentinelAI SDK is now ready for production use!")
print("📖  Documentation: https://pypi.org/project/sentinelai-risk/1.0.0/")
print("🔗 External API: http://localhost:8000/api/analyze/external")
