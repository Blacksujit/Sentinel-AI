#!/bin/bash

# Vercel Deployment Script for SentinelAI MVP
# This script handles the complete deployment process

set -e  # Exit on any error

echo "🚀 Starting Vercel Deployment for SentinelAI MVP"
echo "=================================================="

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI not found. Installing..."
    npm install -g vercel
fi

# Check if user is logged in to Vercel
if ! vercel whoami &> /dev/null; then
    echo "🔐 Please login to Vercel:"
    vercel login
fi

# Step 1: Setup Backend for Vercel
echo ""
echo "🔧 Setting up Backend for Vercel..."
cd Backend

# Check if requirements.txt exists, if not create it
if [ ! -f "requirements.txt" ]; then
    echo "📋 Creating requirements.txt for Vercel..."
    cat > requirements.txt << EOF
# Core FastAPI
fastapi==0.128.0
uvicorn[standard]==0.25.0

# Database
sqlalchemy==2.0.45
pydantic==2.8.0

# HTTP client
httpx==0.28.1

# Environment variables
python-dotenv==1.0.0

# CORS support
python-multipart==0.0.6

# JSON handling
orjson==3.10.7

# Date/time utilities
python-dateutil==2.9.0

# Text processing (lightweight)
numpy==1.26.4
scikit-learn==1.5.0

# Logging
structlog==24.1.0

# File handling
aiofiles==23.2.1

# Vercel specific
vercel==0.4.2
EOF
fi

# Create Vercel serverless function directory
mkdir -p api

# Create main serverless function
cat > api/index.py << 'EOF'
"""
Vercel Serverless Function for SentinelAI Backend
Optimized for Vercel's free tier
"""

import os
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
            "timestamp": "2024-02-02T21:03:00Z"
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
                "analysis_timestamp": "2024-02-02T21:03:00Z",
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

EOF

echo "✅ Backend setup completed"
cd ..

# Step 2: Setup Frontend for Vercel
echo ""
echo "📦 Setting up Frontend for Vercel..."
cd Frontend

# Install dependencies
echo "📥 Installing frontend dependencies..."
npm install

# Use Vercel configuration
echo "🔧 Using Vercel Next.js configuration..."
cp next.config.vercel.js next.config.js

# Create Vercel environment file
echo "🔧 Creating Vercel environment file..."
cat > .env.local << EOF
NEXT_PUBLIC_API_URL=https://your-vercel-app-name.vercel.app/api
NEXT_PUBLIC_ENVIRONMENT=production
EOF

echo "✅ Frontend setup completed"
cd ..

# Step 3: Deploy to Vercel
echo ""
echo "🚀 Deploying to Vercel..."

# Deploy frontend
echo "🌐 Deploying Frontend to Vercel..."
cd Frontend
vercel --prod

echo ""
echo "✅ Vercel Deployment Completed Successfully!"
echo "=================================================="
echo ""
echo "📱 Your SentinelAI MVP is now live at:"
echo "   https://your-vercel-app-name.vercel.app"
echo ""
echo "⚡ Backend API Endpoints:"
echo "   - Health Check: https://your-vercel-app-name.vercel.app/api/health"
echo "   - Analyze: https://your-vercel-app-name.vercel.app/api/analyze/external"
echo "   - Settings: https://your-vercel-app-name.vercel.app/api/settings"
echo ""
echo "📊 Vercel Dashboard:"
echo "   https://vercel.com/dashboard"
echo ""
echo "🎉 Your SentinelAI MVP is now live on Vercel!"
