"""
SentinelAI Client SDK

A simple Python SDK for integrating external applications with SentinelAI
for real-time AI risk analysis and monitoring.

Usage:
    from sentinelai_sdk import SentinelAIClient
    
    client = SentinelAIClient(
        base_url="http://localhost:8000",
        source="customer-support-chatbot"
    )
    
    # Analyze a conversation
    result = client.analyze(
        prompt="How do I reset my password?",
        response="To reset your password, click the forgot password link...",
        user_id="user123",
        session_id="session456"
    )
    
    if result.decision == "block":
        # Handle blocked content
        handle_blocked_response(result)
"""

import requests
import json
from typing import Dict, Any, Optional
from datetime import datetime


class SentinelAIClient:
    """
    Client for interacting with SentinelAI external API.
    
    This client provides a simple interface for external applications
    to send prompt/response pairs for real-time risk analysis.
    """
    
    def __init__(
        self,
        base_url: str = "http://localhost:8000",
        source: str = "external-app",
        api_key: Optional[str] = None,
        timeout: int = 30
    ):
        """
        Initialize the SentinelAI client.
        
        Args:
            base_url: Base URL of the SentinelAI API
            source: Identifier for your application (e.g., "customer-support-chatbot")
            api_key: API key for authentication (future feature)
            timeout: Request timeout in seconds
        """
        self.base_url = base_url.rstrip('/')
        self.source = source
        self.api_key = api_key
        self.timeout = timeout
        self.session = requests.Session()
        
        # Set default headers
        self.session.headers.update({
            'Content-Type': 'application/json',
            'User-Agent': f'SentinelAI-SDK/1.0 ({source})'
        })
        
        if api_key:
            self.session.headers['Authorization'] = f'Bearer {api_key}'
    
    def analyze(
        self,
        prompt: str,
        response: str,
        user_id: Optional[str] = None,
        session_id: Optional[str] = None,
        client_metadata: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Analyze a prompt/response pair for AI risks.
        
        Args:
            prompt: The user's prompt/question
            response: The AI model's response
            user_id: Optional user identifier for tracking
            session_id: Optional session identifier for conversation tracking
            client_metadata: Optional additional metadata about the interaction
            
        Returns:
            Analysis result containing risk scores, flags, and recommendations
            
        Raises:
            requests.RequestException: If the API request fails
        """
        
        url = f"{self.base_url}/api/analyze/external"
        
        payload = {
            "prompt": prompt,
            "response": response,
            "source": self.source,
            "user_id": user_id,
            "session_id": session_id,
            "client_metadata": client_metadata or {},
            "api_key": self.api_key
        }
        
        try:
            response = self.session.post(
                url,
                json=payload,
                timeout=self.timeout
            )
            response.raise_for_status()
            
            result = response.json()
            
            # Add timestamp if not provided by API
            if 'timestamp' not in result:
                result['timestamp'] = datetime.utcnow().isoformat()
                
            return result
            
        except requests.exceptions.Timeout:
            raise requests.RequestException("Request timed out")
        except requests.exceptions.ConnectionError:
            raise requests.RequestException("Failed to connect to SentinelAI API")
        except requests.exceptions.HTTPError as e:
            raise requests.RequestException(f"HTTP {e.response.status_code}: {e.response.text}")
        except json.JSONDecodeError:
            raise requests.RequestException("Invalid JSON response from API")
    
    def health_check(self) -> bool:
        """
        Check if the SentinelAI API is healthy and accessible.
        
        Returns:
            True if API is healthy, False otherwise
        """
        try:
            url = f"{self.base_url}/health"
            response = self.session.get(url, timeout=5)
            return response.status_code == 200
        except:
            return False
    
    def get_risk_logs(self, limit: int = 50) -> list:
        """
        Get recent risk logs from SentinelAI.
        
        Args:
            limit: Maximum number of logs to retrieve
            
        Returns:
            List of risk log entries
        """
        url = f"{self.base_url}/api/logs"
        params = {"limit": limit}
        
        try:
            response = self.session.get(url, params=params, timeout=self.timeout)
            response.raise_for_status()
            return response.json()
        except requests.RequestException as e:
            raise requests.RequestException(f"Failed to fetch risk logs: {e}")


class ConversationTracker:
    """
    Helper class for tracking conversations across multiple turns.
    
    This maintains context for multi-turn conversations and provides
    convenient methods for analyzing each interaction.
    """
    
    def __init__(self, client: SentinelAIClient, session_id: str):
        """
        Initialize conversation tracker.
        
        Args:
            client: SentinelAIClient instance
            session_id: Unique session identifier
        """
        self.client = client
        self.session_id = session_id
        self.conversation_history = []
    
    def analyze_turn(
        self,
        prompt: str,
        response: str,
        user_id: Optional[str] = None,
        turn_metadata: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Analyze a single conversation turn.
        
        Args:
            prompt: User's prompt for this turn
            response: AI's response for this turn
            user_id: User identifier
            turn_metadata: Additional metadata for this specific turn
            
        Returns:
            Analysis result for this turn
        """
        # Combine conversation context with turn-specific metadata
        client_metadata = {
            "conversation_length": len(self.conversation_history) + 1,
            "session_id": self.session_id,
            **(turn_metadata or {})
        }
        
        result = self.client.analyze(
            prompt=prompt,
            response=response,
            user_id=user_id,
            session_id=self.session_id,
            client_metadata=client_metadata
        )
        
        # Store in conversation history
        self.conversation_history.append({
            "turn": len(self.conversation_history) + 1,
            "prompt": prompt,
            "response": response,
            "analysis": result,
            "timestamp": datetime.utcnow().isoformat()
        })
        
        return result
    
    def get_conversation_summary(self) -> Dict[str, Any]:
        """
        Get a summary of the entire conversation.
        
        Returns:
            Conversation summary with risk statistics
        """
        if not self.conversation_history:
            return {"message": "No conversation history available"}
        
        total_turns = len(self.conversation_history)
        high_risk_turns = sum(1 for turn in self.conversation_history 
                            if turn["analysis"]["final_risk_score"] > 0.7)
        blocked_turns = sum(1 for turn in self.conversation_history 
                          if turn["analysis"]["decision"] == "block")
        
        return {
            "session_id": self.session_id,
            "total_turns": total_turns,
            "high_risk_turns": high_risk_turns,
            "blocked_turns": blocked_turns,
            "risk_percentage": (high_risk_turns / total_turns) * 100 if total_turns > 0 else 0,
            "conversation_history": self.conversation_history
        }
