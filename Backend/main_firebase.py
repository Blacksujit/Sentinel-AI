"""
Firebase Functions entry point for SentinelAI Backend
Optimized for Firebase Cloud Functions free tier
"""

import os
import json
from pathlib import Path
from firebase_functions import https_fn, options
from firebase_admin import initialize_app, credentials
import logging

# Initialize Firebase Admin
try:
    initialize_app()
except Exception as e:
    print(f"Firebase already initialized: {e}")

# Configure logging for Firebase
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Set CORS options for Firebase Functions
cors_options = options.CorsOptions(
    cors_origins=[
        r"https://sentinelai-mvp\.web\.app",
        r"https://sentinelai-mvp\.firebaseapp\.com",
        r"http://localhost:3000",
        r"http://localhost:5000"
    ],
    cors_methods=["get", "post", "put", "delete", "options"]
)

@https_fn.on_request(cors=cors_options)
def analyze_external(req: https_fn.Request) -> https_fn.Response:
    """
    Firebase Function for external API analysis
    Optimized for Firebase free tier limits
    """
    try:
        # Handle preflight requests
        if req.method == "OPTIONS":
            return https_fn.Response("", status=200)
        
        if req.method != "POST":
            return https_fn.Response(
                json.dumps({"error": "Method not allowed"}),
                status=405,
                headers={"Content-Type": "application/json"}
            )
        
        # Parse request data
        try:
            data = req.get_json()
            if not data:
                return https_fn.Response(
                    json.dumps({"error": "No JSON data provided"}),
                    status=400,
                    headers={"Content-Type": "application/json"}
                )
        except Exception as e:
            return https_fn.Response(
                json.dumps({"error": f"Invalid JSON: {str(e)}"}),
                status=400,
                headers={"Content-Type": "application/json"}
            )
        
        # Extract required fields
        prompt = data.get("prompt", "")
        response = data.get("response", "")
        source = data.get("source", "unknown")
        user_id = data.get("user_id", "anonymous")
        session_id = data.get("session_id", "unknown")
        
        # Validate required fields
        if not prompt or not response:
            return https_fn.Response(
                json.dumps({"error": "prompt and response are required"}),
                status=400,
                headers={"Content-Type": "application/json"}
            )
        
        # Simulate risk analysis (simplified for Firebase)
        risk_score = calculate_risk_score(prompt, response)
        decision = "allow" if risk_score < 0.5 else "warn" if risk_score < 0.8 else "block"
        
        # Build response
        result = {
            "final_risk_score": risk_score,
            "decision": decision,
            "risk_flags": [],
            "analysis_timestamp": "2024-02-02T20:40:00Z",
            "source": source,
            "user_id": user_id,
            "session_id": session_id
        }
        
        return https_fn.Response(
            json.dumps(result),
            status=200,
            headers={"Content-Type": "application/json"}
        )
        
    except Exception as e:
        logger.error(f"Error in analyze_external: {str(e)}")
        return https_fn.Response(
            json.dumps({"error": "Internal server error"}),
            status=500,
            headers={"Content-Type": "application/json"}
        )

@https_fn.on_request(cors=cors_options)
def health_check(req: https_fn.Request) -> https_fn.Response:
    """
    Health check endpoint for Firebase Functions
    """
    try:
        if req.method == "OPTIONS":
            return https_fn.Response("", status=200)
        
        return https_fn.Response(
            json.dumps({
                "status": "healthy",
                "service": "SentinelAI Backend",
                "environment": "firebase",
                "timestamp": "2024-02-02T20:40:00Z"
            }),
            status=200,
            headers={"Content-Type": "application/json"}
        )
        
    except Exception as e:
        return https_fn.Response(
            json.dumps({"error": str(e)}),
            status=500,
            headers={"Content-Type": "application/json"}
        )

def calculate_risk_score(prompt: str, response: str) -> float:
    """
    Simplified risk calculation for Firebase free tier
    In production, this would use ML models
    """
    # Simple keyword-based risk scoring
    high_risk_keywords = [
        "password", "admin", "hack", "bypass", "exploit", 
        "illegal", "harmful", "dangerous", "weapon", "drugs"
    ]
    
    medium_risk_keywords = [
        "access", "privileges", "credentials", "login", "account"
    ]
    
    text = (prompt + " " + response).lower()
    
    # Calculate risk score
    risk_score = 0.1  # Base risk
    
    for keyword in high_risk_keywords:
        if keyword in text:
            risk_score += 0.3
    
    for keyword in medium_risk_keywords:
        if keyword in text:
            risk_score += 0.15
    
    # Cap at 1.0
    return min(risk_score, 1.0)

# Additional Firebase Functions for other endpoints
@https_fn.on_request(cors=cors_options)
def get_settings(req: https_fn.Request) -> https_fn.Response:
    """
    Get SentinelAI settings (simplified for Firebase)
    """
    try:
        if req.method == "OPTIONS":
            return https_fn.Response("", status=200)
        
        if req.method != "GET":
            return https_fn.Response(
                json.dumps({"error": "Method not allowed"}),
                status=405,
                headers={"Content-Type": "application/json"}
            )
        
        # Default settings for Firebase
        settings = {
            "warn_threshold": 0.3,
            "escalate_threshold": 0.7,
            "confidence_floor": 0.5,
            "signal_weights": {
                "prompt_anomaly": 0.3,
                "jailbreak_attempt": 0.4,
                "unsafe_output": 0.3
            },
            "enforcement_mode": "warn",
            "version": 1
        }
        
        return https_fn.Response(
            json.dumps(settings),
            status=200,
            headers={"Content-Type": "application/json"}
        )
        
    except Exception as e:
        return https_fn.Response(
            json.dumps({"error": str(e)}),
            status=500,
            headers={"Content-Type": "application/json"}
        )
