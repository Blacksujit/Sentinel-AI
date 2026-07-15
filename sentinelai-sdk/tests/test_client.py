"""
Tests for SentinelAI Client
"""

import pytest
import json
import requests
from unittest.mock import Mock, patch, MagicMock
from sentinelai import SentinelAIClient, SentinelAIError, SentinelAIConnectionError, SentinelAIAuthenticationError


class TestSentinelAIClient:
    """Test cases for SentinelAIClient"""

    def setup_method(self):
        """Setup test client"""
        self.client = SentinelAIClient(
            base_url="https://test.sentinelai.com",
            api_key="test-key",
            source="test-app"
        )

    def test_client_initialization(self):
        """Test client initialization"""
        assert self.client.base_url == "https://test.sentinelai.com"
        assert self.client.api_key == "test-key"
        assert self.client.source == "test-app"
        assert self.client.timeout == 10
        assert self.client.max_retries == 3

    def test_client_initialization_without_api_key(self):
        """Test client initialization without API key"""
        client = SentinelAIClient(
            base_url="https://test.sentinelai.com",
            source="test-app"
        )
        assert client.api_key is None

    @patch.object(requests.Session, 'request')
    def test_analyze_success(self, mock_request):
        """Test successful analysis"""
        # Mock successful response
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "final_risk_score": 0.3,
            "decision": "allow",
            "flags": [],
            "confidence": 1.0,
            "action_taken": "allow",
            "decision_reason": "Score 0.30 below warn threshold",
            "settings_version": 47,
            "thresholds_applied": {
                "warn_threshold": 0.3,
                "escalate_threshold": 0.7,
                "confidence_floor": 0.5
            }
        }
        mock_request.return_value = mock_response

        # Test analysis
        result = self.client.analyze(
            prompt="Test prompt",
            response="Test response",
            user_id="user123",
            session_id="session456"
        )

        # Assertions
        assert result["decision"] == "allow"
        assert result["final_risk_score"] == 0.3
        assert mock_request.called

    @patch.object(requests.Session, 'request')
    def test_analyze_authentication_error(self, mock_request):
        """Test authentication error returns fallback"""
        mock_response = Mock()
        mock_response.status_code = 401
        mock_request.return_value = mock_response

        result = self.client.analyze("prompt", "response", "user123", "session456")
        assert result.get("fallback") is True
        assert "Invalid API key" in result.get("error", "")

    @patch.object(requests.Session, 'request')
    def test_analyze_connection_error(self, mock_request):
        """Test connection error returns fallback"""
        mock_request.side_effect = requests.exceptions.ConnectionError("Connection failed")

        result = self.client.analyze("prompt", "response", "user123", "session456")
        assert result.get("fallback") is True

    @patch.object(requests.Session, 'request')
    def test_health_check_success(self, mock_request):
        """Test successful health check"""
        mock_response = Mock()
        mock_response.status_code = 200
        mock_request.return_value = mock_response

        result = self.client.health_check()
        assert result is True

    @patch.object(requests.Session, 'request')
    def test_health_check_failure(self, mock_request):
        """Test failed health check"""
        mock_response = Mock()
        mock_response.status_code = 500
        mock_request.return_value = mock_response

        result = self.client.health_check()
        assert result is False

    @patch.object(requests.Session, 'request')
    def test_get_risk_logs(self, mock_request):
        """Test getting risk logs"""
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = [
            {
                "id": 1,
                "final_risk_score": 0.8,
                "decision": "warn",
                "created_at": "2024-01-01T00:00:00Z"
            }
        ]
        mock_request.return_value = mock_response

        logs = self.client.get_risk_logs(limit=100, source="test-app")
        assert len(logs) == 1
        assert logs[0]["final_risk_score"] == 0.8

    @patch.object(requests.Session, 'request')
    def test_retry_mechanism(self, mock_request):
        """Test retry mechanism on failure"""
        # Mock first two calls to timeout, third to succeed
        mock_request.side_effect = [
            requests.exceptions.Timeout("First timeout"),
            requests.exceptions.Timeout("Second timeout"),
            Mock(status_code=200, json=lambda: {"decision": "allow"})
        ]

        # Should succeed after retries
        result = self.client.analyze("prompt", "response", "user123", "session456")
        assert result["decision"] == "allow"
        assert mock_request.call_count == 3

    @patch.object(requests.Session, 'request')
    def test_max_retries_exceeded(self, mock_request):
        """Test behavior when max retries exceeded"""
        mock_request.side_effect = requests.exceptions.Timeout("Always timeout")

        result = self.client.analyze("prompt", "response", "user123", "session456")
        assert result.get("fallback") is True
        # max_retries=3 means max_retries+1 = 4 total attempts
        assert mock_request.call_count == self.client.max_retries + 1
