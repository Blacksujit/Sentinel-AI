"""
Tests for custom exceptions
"""

import pytest
from sentinelai import SentinelAIError, SentinelAIConnectionError, SentinelAIAuthenticationError


class TestExceptions:
    """Test cases for custom exceptions"""

    def test_sentinel_ai_error(self):
        """Test base SentinelAIError"""
        error = SentinelAIError("Test error")
        assert str(error) == "Test error"
        assert isinstance(error, Exception)

    def test_sentinel_ai_connection_error(self):
        """Test SentinelAIConnectionError"""
        error = SentinelAIConnectionError("Connection failed")
        assert str(error) == "Connection failed"
        assert isinstance(error, SentinelAIError)
        assert isinstance(error, Exception)

    def test_sentinel_ai_authentication_error(self):
        """Test SentinelAIAuthenticationError"""
        error = SentinelAIAuthenticationError("Invalid API key")
        assert str(error) == "Invalid API key"
        assert isinstance(error, SentinelAIError)
        assert isinstance(error, Exception)

    def test_exception_inheritance(self):
        """Test exception inheritance hierarchy"""
        # All should inherit from SentinelAIError
        assert issubclass(SentinelAIConnectionError, SentinelAIError)
        assert issubclass(SentinelAIAuthenticationError, SentinelAIError)
        
        # All should inherit from Exception
        assert issubclass(SentinelAIError, Exception)
        assert issubclass(SentinelAIConnectionError, Exception)
        assert issubclass(SentinelAIAuthenticationError, Exception)

    def test_exception_with_none_message(self):
        """Test exceptions with None message"""
        error = SentinelAIError()
        assert str(error) == ""

    def test_exception_with_empty_message(self):
        """Test exceptions with empty message"""
        error = SentinelAIConnectionError("")
        assert str(error) == ""
