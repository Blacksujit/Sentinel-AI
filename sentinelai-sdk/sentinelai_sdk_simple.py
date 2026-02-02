"""
SentinelAI SDK - Simple Version
Official Python SDK for SentinelAI AI safety platform.
"""

import requests
import json
import time
from typing import Dict, Any, Optional
from datetime import datetime

__version__ = "1.0.0"
__author__ = "SentinelAI Team"
__email__ = "support@sentinelai.com"


class SentinelAIError(Exception):
    """Base exception for SentinelAI SDK errors."""
    pass


class SentinelAIConnectionError(SentinelAIError):
    """Connection related errors."""
    pass


class SentinelAIAuthenticationError(SentinelAIError):
    """Authentication related errors."""
    pass


class SentinelAIClient:
    """Official SentinelAI Python SDK Client."""
    
    def __init__(
        self,
        base_url: str,
        api_key: Optional[str] = None,
        source: str = "python-sdk",
        timeout: int = 10,
        max_retries: int = 3,
        retry_delay: float = 1.0
    ):
        self.base_url = base_url.rstrip('/')
        self.api_key = api_key
        self.source = source
        self.timeout = timeout
        self.max_retries = max_retries
        self.retry_delay = retry_delay
        
        self.session = requests.Session()
        self.session.headers.update({
            'Content-Type': 'application/json',
            'User-Agent': f'SentinelAI-Python-SDK/{__version__} ({source})'
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
        payload = {
            "prompt": prompt,
            "response": response,
            "source": self.source,
            "user_id": user_id,
            "session_id": session_id,
            "client_metadata": {
                "timestamp": datetime.utcnow().isoformat(),
                "sdk_version": __version__,
                **(client_metadata or {})
            }
        }
        
        try:
            response = self.session.request(
                "POST", f"{self.base_url}/api/analyze/external", 
                json=payload, timeout=self.timeout
            )
            
            if response.status_code == 401:
                raise SentinelAIAuthenticationError("Invalid API key")
            elif response.status_code >= 400:
                raise SentinelAIError(f"API error {response.status_code}: {response.text}")
            
            return response.json()
            
        except requests.exceptions.Timeout:
            raise SentinelAIConnectionError("Request timeout")
        except requests.exceptions.ConnectionError:
            raise SentinelAIConnectionError("Connection failed")
        except json.JSONDecodeError:
            raise SentinelAIError("Invalid JSON response")
    
    def health_check(self) -> bool:
        try:
            self.session.request("GET", f"{self.base_url}/health", timeout=self.timeout)
            return True
        except SentinelAIError:
            return False


def quick_analyze(
    base_url: str,
    prompt: str,
    response: str,
    api_key: Optional[str] = None,
    source: str = "quick-integration"
) -> Dict[str, Any]:
    client = SentinelAIClient(base_url, api_key, source)
    return client.analyze(prompt, response)


__all__ = [
    'SentinelAIClient',
    'SentinelAIError',
    'SentinelAIConnectionError',
    'SentinelAIAuthenticationError',
    'quick_analyze'
]
