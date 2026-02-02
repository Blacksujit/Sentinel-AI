"""
SentinelAI SDK Utilities
"""

from typing import Optional, Dict, Any
from .client import SentinelAIClient


def quick_analyze(
    base_url: str,
    prompt: str,
    response: str,
    api_key: Optional[str] = None,
    source: str = "quick-integration"
) -> Dict[str, Any]:
    """
    Quick one-off analysis without client initialization.
    
    Args:
        base_url: SentinelAI base URL
        prompt: User prompt
        response: AI response
        api_key: API key (optional)
        source: Source identifier
        
    Returns:
        Analysis result
    """
    client = SentinelAIClient(base_url, api_key, source)
    return client.analyze(prompt, response)
