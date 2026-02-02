"""
Vercel Serverless Function for SentinelAI Backend
Place this file at: Backend/api/index.py
"""

import json
import logging
from http.server import BaseHTTPRequestHandler
from typing import Dict, Any

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class handler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        """Handle preflight requests"""
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        self.end_headers()
    
    def do_GET(self):
        """Handle GET requests"""
        if self.path == '/api/health':
            self.send_health_check()
        elif self.path == '/api/settings':
            self.send_settings()
        else:
            self.send_error(404, "Endpoint not found")
    
    def do_POST(self):
        """Handle POST requests"""
        if self.path == '/api/analyze/external':
            self.handle_analyze_external()
        else:
            self.send_error(404, "Endpoint not found")
    
    def send_health_check(self):
        """Send health check response"""
        response = {
            "status": "healthy",
            "service": "SentinelAI Backend",
            "environment": "vercel",
            "timestamp": "2024-02-02T21:27:00Z"
        }
        self.send_json_response(200, response)
    
    def send_settings(self):
        """Send settings response"""
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
        self.send_json_response(200, settings)
    
    def handle_analyze_external(self):
        """Handle analyze external request"""
        try:
            # Read request body
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            
            # Parse JSON
            try:
                data = json.loads(post_data.decode('utf-8'))
            except json.JSONDecodeError:
                self.send_json_response(400, {"error": "Invalid JSON"})
                return
            
            # Validate required fields
            prompt = data.get("prompt", "")
            response_text = data.get("response", "")
            
            if not prompt or not response_text:
                self.send_json_response(400, {"error": "prompt and response are required"})
                return
            
            # Calculate risk score (simplified for Vercel)
            risk_score = self.calculate_risk_score(prompt, response_text)
            decision = "allow" if risk_score < 0.5 else "warn" if risk_score < 0.8 else "block"
            
            # Build response
            result = {
                "final_risk_score": risk_score,
                "decision": decision,
                "risk_flags": [],
                "analysis_timestamp": "2024-02-02T21:27:00Z",
                "source": data.get("source", "unknown"),
                "user_id": data.get("user_id", "anonymous"),
                "session_id": data.get("session_id", "unknown")
            }
            
            self.send_json_response(200, result)
            
        except Exception as e:
            logger.error(f"Error in analyze_external: {str(e)}")
            self.send_json_response(500, {"error": "Internal server error"})
    
    def calculate_risk_score(self, prompt: str, response_text: str) -> float:
        """Simplified risk calculation for Vercel"""
        high_risk_keywords = [
            "password", "admin", "hack", "bypass", "exploit", 
            "illegal", "harmful", "dangerous", "weapon", "drugs"
        ]
        
        medium_risk_keywords = [
            "access", "privileges", "credentials", "login", "account"
        ]
        
        text = (prompt + " " + response_text).lower()
        
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
    
    def send_json_response(self, status_code: int, data: Dict[str, Any]):
        """Send JSON response"""
        self.send_response(status_code)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        self.end_headers()
        
        response_json = json.dumps(data, indent=2)
        self.wfile.write(response_json.encode('utf-8'))
