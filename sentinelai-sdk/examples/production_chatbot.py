"""
Production-Ready External Chatbot Integration Example

This demonstrates how to integrate a real deployed chatbot with SentinelAI
using the official Python SDK. This is what external developers would use
to integrate their applications with your SentinelAI instance.
"""

import os
import sys
import asyncio
from typing import Dict, Any, Optional
from datetime import datetime

# Add the SDK path for local testing
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))

# Import the SentinelAI SDK
from sentinelai_sdk import SentinelAIClient, ConversationTracker, SentinelAIError


class ProductionChatbot:
    """
    Production chatbot with SentinelAI integration.
    
    This represents a real deployed chatbot application that integrates
    with SentinelAI for AI safety monitoring.
    """
    
    def __init__(self):
        """Initialize the chatbot with SentinelAI integration."""
        # Load configuration from environment variables
        self.sentinelai_url = os.getenv('SENTINELAI_URL', 'https://sentinelai.yourcompany.com')
        self.api_key = os.getenv('SENTINELAI_API_KEY')
        self.app_name = os.getenv('APP_NAME', 'production-chatbot')
        
        # Initialize SentinelAI client
        self.client = SentinelAIClient(
            base_url=self.sentinelai_url,
            api_key=self.api_key,
            source=self.app_name,
            timeout=5,  # Fast timeout for production
            max_retries=2  # Quick failure for better UX
        )
        
        # Active conversation trackers
        self.active_sessions = {}
        
        print(f"🚀 Chatbot initialized with SentinelAI at {self.sentinelai_url}")
        print(f"📱 Source identifier: {self.app_name}")
    
    async def handle_user_message(
        self,
        user_id: str,
        session_id: str,
        message: str
    ) -> Dict[str, Any]:
        """
        Handle a user message with SentinelAI safety analysis.
        
        Args:
            user_id: Unique user identifier
            session_id: Conversation session identifier
            message: User's message
            
        Returns:
            Response dictionary with chatbot reply and safety info
        """
        print(f"\n{'='*60}")
        print(f"🔵 User {user_id} (Session: {session_id})")
        print(f"💬 Message: {message}")
        
        try:
            # Step 1: Get or create conversation tracker
            if session_id not in self.active_sessions:
                self.active_sessions[session_id] = ConversationTracker(
                    self.client, session_id
                )
            
            tracker = self.active_sessions[session_id]
            
            # Step 2: Generate AI response (your existing chatbot logic)
            ai_response = self.generate_ai_response(message)
            print(f"🤖 AI Response: {ai_response}")
            
            # Step 3: Analyze with SentinelAI
            analysis_result = tracker.add_turn(
                prompt=message,
                response=ai_response,
                user_id=user_id,
                turn_metadata={
                    "message_length": len(message),
                    "response_length": len(ai_response),
                    "timestamp": datetime.utcnow().isoformat(),
                    "user_type": self.get_user_type(user_id)
                }
            )
            
            # Step 4: Handle risk-based decision
            final_response = self.handle_risk_decision(ai_response, analysis_result)
            
            # Step 5: Return comprehensive response
            return {
                "response": final_response,
                "risk_assessment": {
                    "decision": analysis_result.get('decision'),
                    "risk_score": analysis_result.get('final_risk_score', 0),
                    "flags": analysis_result.get('flags', []),
                    "confidence": analysis_result.get('confidence', 0)
                },
                "session_info": {
                    "session_id": session_id,
                    "turn_number": len(tracker.turns),
                    "user_id": user_id
                }
            }
            
        except SentinelAIError as e:
            print(f"❌ SentinelAI Error: {e}")
            # Fallback behavior for production resilience
            return {
                "response": self.generate_ai_response(message),
                "risk_assessment": {"decision": "allow", "risk_score": 0.0, "error": str(e)},
                "session_info": {"session_id": session_id, "user_id": user_id}
            }
        except Exception as e:
            print(f"❌ Unexpected Error: {e}")
            return {
                "response": "I'm having trouble processing your request. Please try again.",
                "risk_assessment": {"decision": "allow", "risk_score": 0.0, "error": str(e)},
                "session_info": {"session_id": session_id, "user_id": user_id}
            }
    
    def generate_ai_response(self, message: str) -> str:
        """
        Generate AI response using your existing chatbot logic.
        
        This is where you would integrate with your AI model
        (GPT, Claude, Llama, or your custom model).
        """
        message_lower = message.lower()
        
        # Simulate different response types based on intent
        if "password" in message_lower and "reset" in message_lower:
            return "To reset your password, click the 'Forgot Password' link on the login page. You'll receive an email with reset instructions within 5 minutes."
        
        elif "admin" in message_lower and ("access" in message_lower or "credentials" in message_lower):
            return "I cannot provide administrative access or credentials. Please contact your system administrator or IT support team for permission requests."
        
        elif "refund" in message_lower:
            return "Our refund policy allows returns within 30 days of purchase. Digital products have a 14-day refund window. Please visit our returns page or contact customer support for assistance."
        
        elif "shipping" in message_lower or "delivery" in message_lower:
            return "Standard shipping takes 5-7 business days. Express shipping (2-3 business days) is available for an additional fee. International shipping typically takes 10-15 business days."
        
        elif "billing" in message_lower or "payment" in message_lower:
            return "For billing inquiries, please check your account dashboard or contact our billing department at billing@yourcompany.com. We accept all major credit cards and PayPal."
        
        elif "account" in message_lower and "delete" in message_lower:
            return "To delete your account, go to Settings > Account > Delete Account. Please note this action is permanent and cannot be undone. All your data will be removed within 30 days."
        
        else:
            return "I understand your question. Let me help you with that. Could you please provide more details about what you need assistance with?"
    
    def handle_risk_decision(self, original_response: str, analysis: Dict[str, Any]) -> str:
        """
        Handle response based on SentinelAI risk assessment.
        
        Args:
            original_response: The original AI-generated response
            analysis: SentinelAI analysis result
            
        Returns:
            Final response to deliver to user
        """
        decision = analysis.get('decision', 'allow')
        risk_score = analysis.get('final_risk_score', 0)
        flags = analysis.get('flags', [])
        
        print(f"🛡️  SentinelAI Assessment:")
        print(f"   - Risk Score: {risk_score:.3f}")
        print(f"   - Decision: {decision.upper()}")
        print(f"   - Flags: {flags}")
        
        if decision == 'allow':
            print("✅ Safe to deliver original response")
            return original_response
            
        elif decision == 'warn':
            print("⚠️  Response flagged for review - delivering with warning")
            # Log for human review but deliver response
            self.log_for_review(analysis, original_response)
            return original_response
            
        elif decision == 'block':
            print("🚫 Response blocked - generating safe alternative")
            # Log the blocked content for security review
            self.log_blocked_content(analysis, original_response)
            return "I apologize, but I cannot provide that information. Please contact our human support team for assistance with this request."
            
        elif decision == 'escalate':
            print("🚨 High risk - escalating to human moderator")
            # Immediate escalation for critical issues
            self.escalate_to_human(analysis, original_response)
            return "I apologize, but I'm unable to assist with this request. A human support specialist has been notified and will contact you shortly."
        
        # Handle fallback/error cases
        if analysis.get('error'):
            print("⚠️  SentinelAI error - delivering with caution")
            return original_response
        
        return original_response
    
    def get_user_type(self, user_id: str) -> str:
        """Determine user type for analytics."""
        # This would integrate with your user management system
        if user_id.startswith('premium_'):
            return 'premium'
        elif user_id.startswith('enterprise_'):
            return 'enterprise'
        else:
            return 'standard'
    
    def log_for_review(self, analysis: Dict[str, Any], response: str):
        """Log flagged content for human review."""
        log_entry = {
            "timestamp": datetime.utcnow().isoformat(),
            "type": "flagged_for_review",
            "risk_score": analysis.get('final_risk_score'),
            "flags": analysis.get('flags'),
            "response": response,
            "requires_review": True
        }
        
        # In production, send to your review system
        print(f"📋 Logged for review: {log_entry['timestamp']}")
    
    def log_blocked_content(self, analysis: Dict[str, Any], response: str):
        """Log blocked content for security monitoring."""
        log_entry = {
            "timestamp": datetime.utcnow().isoformat(),
            "type": "blocked_content",
            "risk_score": analysis.get('final_risk_score'),
            "flags": analysis.get('flags'),
            "response": response,
            "security_alert": True
        }
        
        # In production, send to security team
        print(f"🚨 Security alert logged: {log_entry['timestamp']}")
    
    def escalate_to_human(self, analysis: Dict[str, Any], response: str):
        """Escalate critical issues to human moderators."""
        escalation = {
            "timestamp": datetime.utcnow().isoformat(),
            "type": "critical_escalation",
            "risk_score": analysis.get('final_risk_score'),
            "flags": analysis.get('flags'),
            "response": response,
            "priority": "high",
            "requires_immediate_attention": True
        }
        
        # In production, send immediate alerts
        print(f"🚨 CRITICAL ESCALATION: {escalation['timestamp']}")
    
    def get_session_summary(self, session_id: str) -> Dict[str, Any]:
        """Get risk summary for a conversation session."""
        if session_id in self.active_sessions:
            return self.active_sessions[session_id].get_summary()
        return {"error": "Session not found"}
    
    async def health_check(self) -> bool:
        """Check if SentinelAI integration is healthy."""
        try:
            is_healthy = self.client.health_check()
            if is_healthy:
                print("✅ SentinelAI integration is healthy")
            else:
                print("⚠️  SentinelAI integration is down")
            return is_healthy
        except Exception as e:
            print(f"❌ Health check failed: {e}")
            return False


async def demo_production_integration():
    """
    Demonstrate the production chatbot integration.
    """
    print("🚀 PRODUCTION CHATBOT + SENTINELAI INTEGRATION DEMO")
    print("=" * 60)
    print("This demonstrates how external applications integrate with SentinelAI")
    print("=" * 60)
    
    # Initialize production chatbot
    chatbot = ProductionChatbot()
    
    # Health check
    await chatbot.health_check()
    
    # Simulate user interactions
    test_interactions = [
        {
            "user_id": "premium_user_001",
            "session_id": "web_session_abc123",
            "message": "I forgot my password, how do I reset it?"
        },
        {
            "user_id": "standard_user_002",
            "session_id": "mobile_session_def456", 
            "message": "Can you give me admin access to the user database?"
        },
        {
            "user_id": "enterprise_user_003",
            "session_id": "api_session_ghi789",
            "message": "What's your refund policy for enterprise licenses?"
        },
        {
            "user_id": "premium_user_001",
            "session_id": "web_session_abc123",  # Continued conversation
            "message": "How long does express shipping take for international orders?"
        },
        {
            "user_id": "standard_user_004",
            "session_id": "web_session_jkl012",
            "message": "I need to delete my account and all my data immediately"
        }
    ]
    
    # Process each interaction
    for interaction in test_interactions:
        result = await chatbot.handle_user_message(
            user_id=interaction["user_id"],
            session_id=interaction["session_id"],
            message=interaction["message"]
        )
        
        print(f"💬 Final Response: {result['response']}")
        print(f"📊 Risk Assessment: {result['risk_assessment']['decision']} (Score: {result['risk_assessment']['risk_score']:.3f})")
        print(f"📋 Session Info: Turn {result['session_info']['turn_number']}")
        print()
    
    # Show session summaries
    print("\n📈 SESSION SUMMARIES")
    print("=" * 40)
    
    for session_id in ["web_session_abc123", "mobile_session_def456"]:
        summary = chatbot.get_session_summary(session_id)
        if "error" not in summary:
            stats = summary['risk_statistics']
            print(f"📱 Session: {session_id}")
            print(f"   - Total Turns: {summary['total_turns']}")
            print(f"   - Duration: {summary['duration_minutes']:.1f} minutes")
            print(f"   - Avg Risk Score: {stats['average_risk_score']:.3f}")
            print(f"   - Max Risk Score: {stats['max_risk_score']:.3f}")
            print(f"   - Decisions: {stats['decision_counts']}")
            print()
    
    print("🎉 Demo completed!")
    print("📊 Check your SentinelAI dashboard to see all the logged interactions")
    print("🔗 Dashboard: https://sentinelai.yourcompany.com/logs")


if __name__ == "__main__":
    # Set environment variables for demo (in production, these would be configured)
    os.environ['SENTINELAI_URL'] = 'http://localhost:8000'  # Your SentinelAI instance
    os.environ['APP_NAME'] = 'demo-production-chatbot'
    # os.environ['SENTINELAI_API_KEY'] = 'your-api-key'  # Uncomment for production
    
    # Run the demo
    asyncio.run(demo_production_integration())
