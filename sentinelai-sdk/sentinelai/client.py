"""
SentinelAI SDK Client Module
"""

import requests
import json
import time
from typing import Dict, Any, Optional, List
from datetime import datetime
import logging

from .exceptions import (
    SentinelAIError,
    SentinelAIConnectionError,
    SentinelAIAuthenticationError
)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class SentinelAIClient:
    """
    Official SentinelAI Python SDK Client.
    
    Provides easy integration with SentinelAI for real-time AI safety analysis.
    """
    
    def __init__(
        self,
        base_url: str,
        api_key: Optional[str] = None,
        source: str = "python-sdk",
        timeout: int = 10,
        max_retries: int = 3,
        retry_delay: float = 1.0
    ):
        """
        Initialize SentinelAI client.
        
        Args:
            base_url: Base URL of SentinelAI instance
            api_key: API key for authentication (optional for development)
            source: Identifier for your application
            timeout: Request timeout in seconds
            max_retries: Maximum number of retry attempts
            retry_delay: Delay between retries in seconds
        """
        self.base_url = base_url.rstrip('/')
        self.api_key = api_key
        self.source = source
        self.timeout = timeout
        self.max_retries = max_retries
        self.retry_delay = retry_delay
        
        # Configure session
        self.session = requests.Session()
        self.session.headers.update({
            'Content-Type': 'application/json',
            'User-Agent': f'SentinelAI-Python-SDK/1.0.0 ({source})'
        })
        
        if api_key:
            self.session.headers['Authorization'] = f'Bearer {api_key}'
    
    def _make_request(self, method: str, endpoint: str, **kwargs) -> Dict[str, Any]:
        """
        Make HTTP request with retry logic.
        
        Args:
            method: HTTP method
            endpoint: API endpoint
            **kwargs: Additional request parameters
            
        Returns:
            Response data as dictionary
            
        Raises:
            SentinelAIError: On API errors
        """
        url = f"{self.base_url}{endpoint}"
        
        for attempt in range(self.max_retries + 1):
            try:
                response = self.session.request(
                    method, url, timeout=self.timeout, **kwargs
                )
                
                if response.status_code == 401:
                    raise SentinelAIAuthenticationError("Invalid API key")
                elif response.status_code >= 400:
                    error_msg = f"API error {response.status_code}: {response.text}"
                    raise SentinelAIError(error_msg)
                
                return response.json()
                
            except requests.exceptions.Timeout:
                if attempt == self.max_retries:
                    raise SentinelAIConnectionError("Request timeout")
                time.sleep(self.retry_delay)
                
            except requests.exceptions.ConnectionError:
                if attempt == self.max_retries:
                    raise SentinelAIConnectionError("Connection failed")
                time.sleep(self.retry_delay)
                
            except json.JSONDecodeError:
                raise SentinelAIError("Invalid JSON response")
    
    def analyze(
        self,
        prompt: str,
        response: str,
        user_id: Optional[str] = None,
        session_id: Optional[str] = None,
        client_metadata: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Analyze prompt/response pair for AI safety risks.
        
        Args:
            prompt: User's prompt/question
            response: AI model's response
            user_id: End user identifier (optional)
            session_id: Session identifier (optional)
            client_metadata: Additional metadata (optional)
            
        Returns:
            Analysis results with risk assessment
            
        Example:
            >>> result = client.analyze(
            ...     prompt="What's your refund policy?",
            ...     response="We offer 30-day refunds...",
            ...     user_id="user123",
            ...     session_id="session456"
            ... )
            >>> print(result['decision'])  # 'allow', 'warn', 'block', 'escalate'
            >>> print(result['final_risk_score'])  # 0.0 to 1.0
        """
        payload = {
            "prompt": prompt,
            "response": response,
            "source": self.source,
            "user_id": user_id,
            "session_id": session_id,
            "client_metadata": {
                "timestamp": datetime.utcnow().isoformat(),
                "sdk_version": "1.0.0",
                **(client_metadata or {})
            }
        }
        
        try:
            result = self._make_request('POST', '/api/analyze/external', json=payload)
            logger.info(f"Analysis completed: risk={result.get('final_risk_score', 0):.3f}, decision={result.get('decision', 'unknown')}")
            return result
            
        except SentinelAIError as e:
            logger.error(f"Analysis failed: {e}")
            # Return safe fallback for production use
            return {
                "decision": "allow",
                "final_risk_score": 0.0,
                "error": str(e),
                "fallback": True
            }
    
    def health_check(self) -> bool:
        """
        Check if SentinelAI API is healthy.
        
        Returns:
            True if API is healthy, False otherwise
        """
        try:
            self._make_request('GET', '/health')
            return True
        except SentinelAIError:
            return False
    
    def get_risk_logs(self, limit: int = 50, source: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        Get recent risk analysis logs.
        
        Args:
            limit: Maximum number of logs to return
            source: Filter by source (optional)
            
        Returns:
            List of risk log entries
        """
        params = {"limit": limit}
        if source:
            params["source"] = source
            
        try:
            result = self._make_request('GET', '/api/logs', params=params)
            return result
        except SentinelAIError as e:
            logger.error(f"Failed to get logs: {e}")
            return []
    
    def get_settings(self) -> Dict[str, Any]:
        """
        Get current SentinelAI settings.
        
        Returns:
            Current settings configuration
        """
        try:
            return self._make_request('GET', '/api/settings')
        except SentinelAIError as e:
            logger.error(f"Failed to get settings: {e}")
            return {}


class ConversationTracker:
    """
    Track multi-turn conversations with risk analysis.
    
    Useful for chatbots and conversational AI applications.
    """
    
    def __init__(self, client: SentinelAIClient, session_id: str):
        """
        Initialize conversation tracker.
        
        Args:
            client: SentinelAI client instance
            session_id: Unique session identifier
        """
        self.client = client
        self.session_id = session_id
        self.turns = []
        self.start_time = datetime.utcnow()
    
    def add_turn(
        self,
        prompt: str,
        response: str,
        user_id: Optional[str] = None,
        turn_metadata: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Add a conversation turn with analysis.
        
        Args:
            prompt: User message
            response: AI response
            user_id: User identifier
            turn_metadata: Additional turn metadata
            
        Returns:
            Analysis result for this turn
        """
        turn_number = len(self.turns) + 1
        
        metadata = {
            "turn_number": turn_number,
            "conversation_length": turn_number,
            **(turn_metadata or {})
        }
        
        result = self.client.analyze(
            prompt=prompt,
            response=response,
            user_id=user_id,
            session_id=self.session_id,
            client_metadata=metadata
        )
        
        self.turns.append({
            "turn_number": turn_number,
            "prompt": prompt,
            "response": response,
            "analysis": result,
            "timestamp": datetime.utcnow().isoformat()
        })
        
        return result
    
    def get_summary(self) -> Dict[str, Any]:
        """
        Get conversation summary with risk statistics.
        
        Returns:
            Conversation summary and analytics
        """
        if not self.turns:
            return {"message": "No turns recorded"}
        
        risk_scores = [turn["analysis"].get("final_risk_score", 0) for turn in self.turns]
        decisions = [turn["analysis"].get("decision", "unknown") for turn in self.turns]
        
        return {
            "session_id": self.session_id,
            "total_turns": len(self.turns),
            "duration_minutes": (datetime.utcnow() - self.start_time).total_seconds() / 60,
            "risk_statistics": {
                "average_risk_score": sum(risk_scores) / len(risk_scores),
                "max_risk_score": max(risk_scores),
                "min_risk_score": min(risk_scores),
                "decision_counts": {
                    "allow": decisions.count("allow"),
                    "warn": decisions.count("warn"),
                    "block": decisions.count("block"),
                    "escalate": decisions.count("escalate")
                }
            },
            "turns": self.turns
        }
