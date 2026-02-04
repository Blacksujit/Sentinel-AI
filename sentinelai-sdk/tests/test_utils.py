"""
Tests for utility functions
"""

import pytest
from unittest.mock import Mock, patch
from sentinelai import quick_analyze, SentinelAIError


class TestUtils:
    """Test cases for utility functions"""

    @patch('sentinelai.utils.SentinelAIClient')
    def test_quick_analyze_success(self, mock_client_class):
        """Test quick_analyze utility function"""
        # Mock client instance
        mock_client = Mock()
        mock_client_class.return_value = mock_client
        
        # Mock successful analysis
        mock_client.analyze.return_value = {
            "final_risk_score": 0.3,
            "decision": "allow",
            "flags": [],
            "confidence": 1.0
        }

        # Test quick_analyze
        result = quick_analyze(
            prompt="Test prompt",
            response="Test response",
            base_url="https://test.sentinelai.com"
        )

        # Assertions
        assert result["decision"] == "allow"
        assert result["final_risk_score"] == 0.3
        mock_client_class.assert_called_once_with(
            base_url="https://test.sentinelai.com",
            source="quick-analyze"
        )
        mock_client.analyze.assert_called_once()

    @patch('sentinelai.utils.SentinelAIClient')
    def test_quick_analyze_with_api_key(self, mock_client_class):
        """Test quick_analyze with API key"""
        mock_client = Mock()
        mock_client_class.return_value = mock_client
        
        mock_client.analyze.return_value = {
            "decision": "allow",
            "final_risk_score": 0.2
        }

        # Test with API key
        result = quick_analyze(
            prompt="Test",
            response="Test",
            base_url="https://test.com",
            api_key="test-key"
        )

        mock_client_class.assert_called_once_with(
            base_url="https://test.com",
            api_key="test-key",
            source="quick-analyze"
        )

    @patch('sentinelai.utils.SentinelAIClient')
    def test_quick_analyze_error_handling(self, mock_client_class):
        """Test quick_analyze error handling"""
        mock_client = Mock()
        mock_client_class.return_value = mock_client
        
        # Mock client to raise exception
        mock_client.analyze.side_effect = SentinelAIError("API Error")

        # Test error handling
        with pytest.raises(SentinelAIError):
            quick_analyze(
                prompt="Test",
                response="Test",
                base_url="https://test.com"
            )
