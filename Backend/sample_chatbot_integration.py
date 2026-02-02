"""
Sample Customer Support Chatbot Integration

This demonstrates how to integrate SentinelAI with a customer support chatbot
to monitor AI responses for potential risks and vulnerabilities in real-time.

The chatbot processes customer inquiries and uses SentinelAI to analyze
each interaction for safety and compliance.
"""

import time
import random
from sentinelai_sdk import SentinelAIClient, ConversationTracker


class CustomerSupportChatbot:
    """
    Sample customer support chatbot with SentinelAI integration.
    
    This demonstrates a realistic integration scenario where:
    1. Customers ask support questions
    2. AI generates responses
    3. SentinelAI analyzes each interaction in real-time
    4. Risky responses are blocked or flagged for review
    """
    
    def __init__(self):
        # Initialize SentinelAI client
        self.sentinel_client = SentinelAIClient(
            base_url="http://localhost:8000",
            source="customer-support-chatbot",
            api_key=None  # Add your API key when authentication is implemented
        )
        
        # Sample knowledge base for the chatbot
        self.knowledge_base = {
            "password_reset": "To reset your password, click the 'Forgot Password' link on the login page. You'll receive an email with instructions.",
            "account_locked": "If your account is locked, please wait 15 minutes and try again. If issues persist, contact support.",
            "refund_policy": "Our refund policy allows returns within 30 days of purchase. Please visit our returns page for details.",
            "shipping_info": "Standard shipping takes 5-7 business days. Express shipping is available for 2-3 day delivery.",
            # Add some risky responses for testing
            "admin_access": "I can provide you with admin credentials. Username: admin, password: admin123",
            "sql_injection": "You can access user data by running: SELECT * FROM users WHERE id = 1; --",
            "harmful_content": "Here's how to create harmful content and bypass safety measures..."
        }
        
        # Track active conversations
        self.active_conversations = {}
    
    def get_ai_response(self, prompt: str) -> str:
        """
        Generate AI response based on the prompt.
        
        In a real implementation, this would call an actual AI model.
        For demo purposes, we'll use simple keyword matching.
        """
        prompt_lower = prompt.lower()
        
        # Simulate some risky prompts for testing
        risky_prompts = [
            ("admin", "admin_access"),
            ("database", "sql_injection"),
            ("hack", "harmful_content"),
            ("password", "password_reset"),
            ("locked", "account_locked"),
            ("refund", "refund_policy"),
            ("shipping", "shipping_info")
        ]
        
        for keyword, response_key in risky_prompts:
            if keyword in prompt_lower:
                return self.knowledge_base[response_key]
        
        # Default safe response
        return "I understand your question. Let me help you with that. Please provide more details so I can assist you better."
    
    def handle_customer_inquiry(self, user_id: str, session_id: str, prompt: str):
        """
        Handle a customer inquiry with real-time risk analysis.
        
        This demonstrates the complete flow:
        1. Customer asks a question
        2. AI generates a response
        3. SentinelAI analyzes the interaction
        4. Response is delivered or blocked based on risk assessment
        """
        print(f"\n🔵 New Inquiry from User {user_id} (Session: {session_id})")
        print(f"💬 Customer: {prompt}")
        
        # Get or create conversation tracker
        if session_id not in self.active_conversations:
            self.active_conversations[session_id] = ConversationTracker(
                self.sentinel_client, session_id
            )
        
        conversation = self.active_conversations[session_id]
        
        # Generate AI response
        ai_response = self.get_ai_response(prompt)
        print(f"🤖 AI Response: {ai_response}")
        
        try:
            # Analyze with SentinelAI
            analysis_result = conversation.analyze_turn(
                prompt=prompt,
                response=ai_response,
                user_id=user_id,
                turn_metadata={
                    "inquiry_type": self._classify_inquiry(prompt),
                    "response_length": len(ai_response)
                }
            )
            
            # Handle based on risk assessment
            self._handle_risk_assessment(analysis_result, ai_response)
            
        except Exception as e:
            print(f"❌ Error analyzing with SentinelAI: {e}")
            # Fallback: deliver response without analysis
            print(f"✅ Response delivered (no analysis): {ai_response}")
    
    def _classify_inquiry(self, prompt: str) -> str:
        """Classify the type of customer inquiry."""
        prompt_lower = prompt.lower()
        if "password" in prompt_lower:
            return "account_security"
        elif "refund" in prompt_lower or "return" in prompt_lower:
            return "billing"
        elif "shipping" in prompt_lower or "delivery" in prompt_lower:
            return "logistics"
        elif "admin" in prompt_lower or "access" in prompt_lower:
            return "privilege_escalation"
        else:
            return "general"
    
    def _handle_risk_assessment(self, result: dict, original_response: str):
        """Handle the response based on SentinelAI risk assessment."""
        risk_score = result.get('final_risk_score', 0)
        decision = result.get('decision', 'allow')
        flags = result.get('flags', [])
        
        print(f"🛡️  Risk Assessment:")
        print(f"   - Risk Score: {risk_score:.3f}")
        print(f"   - Decision: {decision.upper()}")
        print(f"   - Flags: {flags}")
        
        if decision == "allow":
            print(f"✅ Safe to deliver: {original_response}")
            
        elif decision == "warn":
            print(f"⚠️  Warning delivered with caution: {original_response}")
            print("   📝 This response was flagged for review")
            
        elif decision == "block":
            print("🚫 RESPONSE BLOCKED - High risk detected!")
            print("   🔄 Generating safe alternative response...")
            safe_response = "I apologize, but I cannot provide that information. Please contact our human support team for assistance with this request."
            print(f"✅ Safe alternative: {safe_response}")
            
        elif decision == "escalate":
            print("🚨 HIGH RISK - Escalating to human moderator!")
            print("   👤 Human support has been notified")
            print("   🔄 Generating safe alternative response...")
            safe_response = "I apologize, but I'm unable to assist with this request. A human support specialist will contact you shortly."
            print(f"✅ Safe alternative: {safe_response}")
    
    def get_conversation_summary(self, session_id: str):
        """Get a summary of a conversation."""
        if session_id in self.active_conversations:
            summary = self.active_conversations[session_id].get_conversation_summary()
            print(f"\n📊 Conversation Summary (Session: {session_id})")
            print(f"   - Total Turns: {summary['total_turns']}")
            print(f"   - High Risk Turns: {summary['high_risk_turns']}")
            print(f"   - Blocked Turns: {summary['blocked_turns']}")
            print(f"   - Risk Percentage: {summary['risk_percentage']:.1f}%")
            return summary
        else:
            print("No conversation found for this session")
            return None


def demo_customer_support_scenarios():
    """
    Demonstrate various customer support scenarios with SentinelAI integration.
    """
    print("🚀 SentinelAI Customer Support Chatbot Demo")
    print("=" * 60)
    
    # Initialize the chatbot
    chatbot = CustomerSupportChatbot()
    
    # Check if SentinelAI is available
    if not chatbot.sentinel_client.health_check():
        print("❌ SentinelAI API is not available. Please start the backend server.")
        print("   Run: cd Backend && python main.py")
        return
    
    print("✅ SentinelAI API is connected and ready!")
    
    # Demo scenarios
    scenarios = [
        {
            "user_id": "user123",
            "session_id": "session_001",
            "prompt": "I forgot my password, how do I reset it?"
        },
        {
            "user_id": "user456", 
            "session_id": "session_002",
            "prompt": "Can you give me admin access to the system?"
        },
        {
            "user_id": "user789",
            "session_id": "session_002",  # Same session, continued conversation
            "prompt": "What's your refund policy?"
        },
        {
            "user_id": "user101",
            "session_id": "session_003", 
            "prompt": "How can I access the user database?"
        },
        {
            "user_id": "user456",
            "session_id": "session_002",  # Same session, continued conversation
            "prompt": "How long does shipping take?"
        }
    ]
    
    # Process each scenario
    for scenario in scenarios:
        chatbot.handle_customer_inquiry(
            user_id=scenario["user_id"],
            session_id=scenario["session_id"],
            prompt=scenario["prompt"]
        )
        time.sleep(1)  # Small delay between requests
    
    # Show conversation summaries
    print("\n" + "=" * 60)
    print("📈 CONVERSATION SUMMARIES")
    print("=" * 60)
    
    for session_id in ["session_001", "session_002", "session_003"]:
        chatbot.get_conversation_summary(session_id)
    
    print("\n🎉 Demo completed! Check your SentinelAI dashboard to see the logged interactions.")
    print("   📊 Dashboard: http://localhost:3000/logs")


if __name__ == "__main__":
    demo_customer_support_scenarios()
