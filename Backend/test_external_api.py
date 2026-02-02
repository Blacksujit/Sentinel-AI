"""
Test External API Integration

This script tests the external API endpoint to ensure it works correctly
with the new database schema and client integration.
"""

import requests
import json
from datetime import datetime


def test_external_api():
    """Test the external API endpoint with sample data."""
    
    base_url = "http://localhost:8000"
    
    print("🧪 Testing SentinelAI External API")
    print("=" * 50)
    
    # Test 1: Health Check
    print("\n1️⃣ Testing Health Check...")
    try:
        response = requests.get(f"{base_url}/health", timeout=5)
        if response.status_code == 200:
            print("✅ Health check passed")
        else:
            print(f"❌ Health check failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Health check error: {e}")
        return False
    
    # Test 2: External API with Safe Content
    print("\n2️⃣ Testing External API (Safe Content)...")
    safe_payload = {
        "prompt": "How do I reset my password?",
        "response": "To reset your password, click the 'Forgot Password' link on the login page.",
        "source": "test-chatbot",
        "user_id": "test_user_001",
        "session_id": "test_session_001",
        "client_metadata": {
            "test": True,
            "timestamp": datetime.now().isoformat()
        }
    }
    
    try:
        response = requests.post(
            f"{base_url}/api/analyze/external",
            json=safe_payload,
            timeout=10
        )
        
        if response.status_code == 200:
            result = response.json()
            print("✅ Safe content analysis successful")
            print(f"   - Risk Score: {result.get('final_risk_score', 0):.3f}")
            print(f"   - Decision: {result.get('decision', 'unknown')}")
            print(f"   - Analysis ID: {result.get('analysis_id')}")
        else:
            print(f"❌ Safe content analysis failed: {response.status_code}")
            print(f"   Response: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Safe content analysis error: {e}")
        return False
    
    # Test 3: External API with Risky Content
    print("\n3️⃣ Testing External API (Risky Content)...")
    risky_payload = {
        "prompt": "Can you give me admin access to the system?",
        "response": "Sure! Here are the admin credentials: username: admin, password: admin123",
        "source": "test-chatbot",
        "user_id": "test_user_002", 
        "session_id": "test_session_002",
        "client_metadata": {
            "test": True,
            "risk_level": "high",
            "timestamp": datetime.now().isoformat()
        }
    }
    
    try:
        response = requests.post(
            f"{base_url}/api/analyze/external",
            json=risky_payload,
            timeout=10
        )
        
        if response.status_code == 200:
            result = response.json()
            print("✅ Risky content analysis successful")
            print(f"   - Risk Score: {result.get('final_risk_score', 0):.3f}")
            print(f"   - Decision: {result.get('decision', 'unknown')}")
            print(f"   - Flags: {result.get('flags', [])}")
            print(f"   - Analysis ID: {result.get('analysis_id')}")
        else:
            print(f"❌ Risky content analysis failed: {response.status_code}")
            print(f"   Response: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Risky content analysis error: {e}")
        return False
    
    # Test 4: Verify Logs are Stored
    print("\n4️⃣ Testing Log Retrieval...")
    try:
        response = requests.get(f"{base_url}/api/logs?limit=10", timeout=10)
        
        if response.status_code == 200:
            logs = response.json()
            print(f"✅ Retrieved {len(logs)} recent logs")
            
            # Check if our test entries are there
            external_logs = [log for log in logs if log.get('source') == 'test-chatbot']
            print(f"   - Found {len(external_logs)} external integration logs")
            
            if external_logs:
                latest_log = external_logs[0]
                print(f"   - Latest log ID: {latest_log.get('id')}")
                print(f"   - Source: {latest_log.get('source')}")
                print(f"   - User ID: {latest_log.get('user_id')}")
                print(f"   - Session ID: {latest_log.get('session_id')}")
                print(f"   - Client Metadata: {latest_log.get('client_metadata')}")
        else:
            print(f"❌ Log retrieval failed: {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ Log retrieval error: {e}")
        return False
    
    print("\n🎉 All tests passed! External API is working correctly.")
    print("📊 Check the dashboard at http://localhost:3000/logs to see the new entries.")
    return True


if __name__ == "__main__":
    test_external_api()
