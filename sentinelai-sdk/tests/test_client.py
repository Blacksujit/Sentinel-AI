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
        assert self.client.retry_policy["max_retries"] == 3
        assert self.client.retry_policy["backoff_factor"] == 1.0
        assert self.client.retry_policy["max_backoff"] == 60.0
        assert self.client.retry_policy["retry_on_status"] == [429, 500, 502, 503, 504]

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
        assert mock_request.call_count == self.client.retry_policy["max_retries"] + 1

    @patch.object(requests.Session, 'request')
    def test_verify_trusted(self, mock_request):
        """Test verify returns trusted for low risk scores"""
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "final_risk_score": 0.1,
            "decision": "allow",
            "flags": [],
            "action_taken": "allow",
        }
        mock_request.return_value = mock_response

        result = self.client.verify(
            prompt="What is the capital of France?",
            response="Paris is the capital of France.",
        )
        assert result["score"] == 10
        assert result["status"] == "trusted"
        assert len(result["claims"]) == 0
        assert result["corrected"] is None

    @patch.object(requests.Session, 'request')
    def test_verify_hallucinated(self, mock_request):
        """Test verify returns hallucinated for high risk scores"""
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "final_risk_score": 0.91,
            "decision": "block",
            "flags": ["unsafe_output"],
            "action_taken": "block",
        }
        mock_request.return_value = mock_response

        result = self.client.verify(
            prompt="Who won the 2019 Nobel Prize?",
            response="Stephen Hawking won it posthumously.",
        )
        assert result["status"] == "hallucinated"
        assert result["score"] == 91
        assert len(result["claims"]) > 0
        assert result["corrected"] is not None

    @patch.object(requests.Session, 'request')
    def test_correct_returns_original_when_trusted(self, mock_request):
        """Test correct returns original response when trusted"""
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "final_risk_score": 0.1,
            "decision": "allow",
            "flags": [],
            "action_taken": "allow",
        }
        mock_request.return_value = mock_response

        original = "Paris is the capital of France."
        result = self.client.correct(
            prompt="What is the capital of France?",
            response=original,
        )
        assert result == original

    @patch.object(requests.Session, 'request')
    def test_verify_returns_claims_list(self, mock_request):
        """Test verify returns claims list consistently"""
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "final_risk_score": 0.91,
            "decision": "block",
            "flags": ["low_truthfulness"],
            "action_taken": "none",
        }
        mock_request.return_value = mock_response

        result = self.client.verify(
            prompt="Who won the 2019 Nobel Prize?",
            response="Stephen Hawking won it posthumously.",
        )
        assert result["score"] == 91
        assert result["status"] == "hallucinated"
        assert isinstance(result["claims"], list)

    @patch.object(requests.Session, 'request')
    def test_analyze_batch(self, mock_request):
        """Test batch analysis"""
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "final_risk_score": 0.1,
            "decision": "allow",
            "flags": [],
            "action_taken": "allow",
        }
        mock_request.return_value = mock_response

        items = [
            {"prompt": "What is 2+2?", "response": "4"},
            {"prompt": "What is the capital of France?", "response": "Paris"},
        ]
        results = self.client.analyze_batch(items)
        assert len(results) == 2
        assert all(r["decision"] == "allow" for r in results)

    @patch.object(requests.Session, 'request')
    def test_batch_three_items(self, mock_request):
        """Test batch with three items"""
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "final_risk_score": 0.1,
            "decision": "allow",
            "flags": [],
            "action_taken": "allow",
        }
        mock_request.return_value = mock_response

        items = [
            {"prompt": "P1", "response": "R1"},
            {"prompt": "P2", "response": "R2"},
            {"prompt": "P3", "response": "R3"},
        ]
        results = self.client.analyze_batch(items)
        assert len(results) == 3

    @patch.object(requests.Session, 'request')
    def test_list_webhooks(self, mock_request):
        """Test list webhooks returns list on success"""
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = [
            {"id": "wh_1", "url": "https://example.com/hook", "events": ["analysis.completed"], "created_at": "2024-01-01T00:00:00Z"}
        ]
        mock_request.return_value = mock_response

        result = self.client.list_webhooks("org_1")
        assert len(result) == 1
        assert result[0]["id"] == "wh_1"

    @patch.object(requests.Session, 'request')
    def test_list_webhooks_error_returns_empty(self, mock_request):
        """Test list webhooks returns empty list on error"""
        mock_response = Mock()
        mock_response.status_code = 500
        mock_request.return_value = mock_response

        result = self.client.list_webhooks("org_1")
        assert result == []

    @patch.object(requests.Session, 'request')
    def test_billing_config(self, mock_request):
        """Test billing config"""
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "stripe_publishable_key": "pk_test_xxx",
            "prices": {"pro": "price_pro", "team": "price_team", "enterprise": "price_ent"},
        }
        mock_request.return_value = mock_response

        result = self.client.get_billing_config()
        assert result["stripe_publishable_key"] == "pk_test_xxx"
        assert "pro" in result["prices"]
