"""
Tests for SentinelAI Client
"""

import pytest
import json
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

    @patch('sentinelai.client.requests.post')
    def test_analyze_success(self, mock_post):
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
        mock_post.return_value = mock_response

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
        assert mock_post.called_once

    @patch('sentinelai.client.requests.post')
    def test_analyze_authentication_error(self, mock_post):
        """Test authentication error"""
        mock_response = Mock()
        mock_response.status_code = 401
        mock_post.return_value = mock_response

        with pytest.raises(SentinelAIAuthenticationError):
            self.client.analyze("prompt", "response", "user123", "session456")

    @patch('sentinelai.client.requests.post')
    def test_analyze_connection_error(self, mock_post):
        """Test connection error"""
        mock_post.side_effect = Exception("Connection failed")

        with pytest.raises(SentinelAIConnectionError):
            self.client.analyze("prompt", "response", "user123", "session456")

    @patch('sentinelai.client.requests.get')
    def test_health_check_success(self, mock_get):
        """Test successful health check"""
        mock_response = Mock()
        mock_response.status_code = 200
        mock_get.return_value = mock_response

        result = self.client.health_check()
        assert result is True

    @patch('sentinelai.client.requests.get')
    def test_health_check_failure(self, mock_get):
        """Test failed health check"""
        mock_response = Mock()
        mock_response.status_code = 500
        mock_get.return_value = mock_response

        result = self.client.health_check()
        assert result is False

    @patch('sentinelai.client.requests.get')
    def test_get_risk_logs(self, mock_get):
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
        mock_get.return_value = mock_response

        logs = self.client.get_risk_logs(limit=100, source="test-app")
        assert len(logs) == 1
        assert logs[0]["final_risk_score"] == 0.8

    def test_build_url(self):
        """Test URL building"""
        url = self.client._build_url("/api/analyze")
        assert url == "https://test.sentinelai.com/api/analyze"

    def test_build_url_with_leading_slash(self):
        """Test URL building with leading slash"""
        url = self.client._build_url("api/analyze")
        assert url == "https://test.sentinelai.com/api/analyze"

    @patch('sentinelai.client.requests.post')
    def test_retry_mechanism(self, mock_post):
        """Test retry mechanism on failure"""
        # Mock first two calls to fail, third to succeed
        mock_post.side_effect = [
            Exception("First failure"),
            Exception("Second failure"),
            Mock(status_code=200, json=lambda: {"decision": "allow"})
        ]

        # Should succeed after retries
        result = self.client.analyze("prompt", "response", "user123", "session456")
        assert result["decision"] == "allow"
        assert mock_post.call_count == 3

    @patch('sentinelai.client.requests.post')
    def test_max_retries_exceeded(self, mock_post):
        """Test behavior when max retries exceeded"""
        mock_post.side_effect = Exception("Always fails")

        with pytest.raises(SentinelAIConnectionError):
            self.client.analyze("prompt", "response", "user123", "session456")
        
        # Should have tried max_retries times
        assert mock_post.call_count == self.client.max_retries
