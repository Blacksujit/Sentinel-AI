#!/usr/bin/env python3
"""
SentinelAI API Key Generator

Generate secure API keys for external client authentication.
"""

import secrets
import string
import os
from datetime import datetime

def generate_api_key(length=32):
    """Generate a secure random API key."""
    chars = string.ascii_letters + string.digits + "!@#$%^&*"
    return ''.join(secrets.choice(chars) for _ in range(length))

def generate_multiple_keys(count=3, length=32):
    """Generate multiple API keys."""
    print(f"🔑 Generated {count} SentinelAI API Keys")
    print("=" * 50)
    print(f"Generated on: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print()
    
    keys = []
    for i in range(count):
        key = generate_api_key(length)
        keys.append(key)
        print(f"API_KEY_{i+1}: {key}")
    
    print()
    print("📝 Add these to your .env file:")
    print(f"SENTINELAI_API_KEYS={','.join(keys)}")
    print()
    print("🔐 Security Tips:")
    print("- Store these keys securely")
    print("- Don't commit them to version control")
    print("- Rotate keys regularly")
    print("- Use different keys for different environments")
    
    return keys

if __name__ == "__main__":
    # Generate 3 API keys by default
    generate_multiple_keys(count=3, length=32)
