"""
SentinelAI SDK Package
"""

__version__ = "1.0.0"
__author__ = "SentinelAI Team"
__email__ = "support@sentinelai.com"

from .client import SentinelAIClient, ConversationTracker
from .exceptions import SentinelAIError, SentinelAIConnectionError, SentinelAIAuthenticationError
from .utils import quick_analyze

__all__ = [
    'SentinelAIClient',
    'ConversationTracker',
    'SentinelAIError',
    'SentinelAIConnectionError',
    'SentinelAIAuthenticationError',
    'quick_analyze'
]
