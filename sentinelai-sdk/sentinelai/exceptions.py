"""
SentinelAI SDK Exceptions
"""


class SentinelAIError(Exception):
    """Base exception for SentinelAI SDK errors."""
    pass


class SentinelAIConnectionError(SentinelAIError):
    """Connection related errors."""
    pass


class SentinelAIAuthenticationError(SentinelAIError):
    """Authentication related errors."""
    pass
