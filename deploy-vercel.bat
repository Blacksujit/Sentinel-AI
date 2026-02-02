@echo off
REM Vercel Deployment Script for SentinelAI MVP (Windows)
REM This script handles the complete deployment process

echo 🚀 Starting Vercel Deployment for SentinelAI MVP
echo ==================================================

REM Check if Vercel CLI is installed
vercel --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Vercel CLI not found. Installing...
    npm install -g vercel
)

REM Check if user is logged in to Vercel
vercel whoami >nul 2>&1
if %errorlevel% neq 0 (
    echo 🔐 Please login to Vercel:
    vercel login
)

REM Step 1: Setup Backend for Vercel
echo.
echo 🔧 Setting up Backend for Vercel...
cd Backend

REM Check if requirements.txt exists, if not create it
if not exist "requirements.txt" (
    echo 📋 Creating requirements.txt for Vercel...
    (
        echo # Core FastAPI
        echo fastapi==0.128.0
        echo uvicorn[standard]==0.25.0
        echo.
        echo # Database
        echo sqlalchemy==2.0.45
        echo pydantic==2.8.0
        echo.
        echo # HTTP client
        echo httpx==0.28.1
        echo.
        echo # Environment variables
        echo python-dotenv==1.0.0
        echo.
        echo # CORS support
        echo python-multipart==0.0.6
        echo.
        echo # JSON handling
        echo orjson==3.10.7
        echo.
        echo # Date/time utilities
        echo python-dateutil==2.9.0
        echo.
        echo # Text processing ^(lightweight^)
        echo numpy==1.26.4
        echo scikit-learn==1.5.0
        echo.
        echo # Logging
        echo structlog==24.1.0
        echo.
        echo # File handling
        echo aiofiles==23.2.1
        echo.
        echo # Vercel specific
        echo vercel==0.4.2
    ) > requirements.txt
)

REM Create Vercel serverless function directory
if not exist "api" mkdir api

REM Create main serverless function
echo 📋 Creating Vercel serverless function...
(
echo """
echo Vercel Serverless Function for SentinelAI Backend
echo Optimized for Vercel's free tier
echo """
echo.
echo import os
echo import json
echo import logging
echo from http.server import BaseHTTPRequestHandler
echo from typing import Dict, Any
echo.
echo # Configure logging
echo logging.basicConfig^(level=logging.INFO^)
echo logger = logging.getLogger^(__name__^)
echo.
echo class handler^(BaseHTTPRequestHandler^):
echo     def do_OPTIONS^(self^):
echo         """Handle preflight requests"""
echo         self.send_response^(200^)
echo         self.send_header^('Access-Control-Allow-Origin', '*'^)
echo         self.send_header^('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS'^)
echo         self.send_header^('Access-Control-Allow-Headers', 'Content-Type, Authorization'^)
echo         self.end_headers^(^)
echo.
echo     def do_GET^(self^):
echo         """Handle GET requests"""
echo         if self.path == '/api/health':
echo             self.send_health_check^(^)
echo         elif self.path == '/api/settings':
echo             self.send_settings^(^)
echo         else:
echo             self.send_error^(404, "Endpoint not found"^)
echo.
echo     def do_POST^(self^):
echo         """Handle POST requests"""
echo         if self.path == '/api/analyze/external':
echo             self.handle_analyze_external^(^)
echo         else:
echo             self.send_error^(404, "Endpoint not found"^)
echo.
echo     def send_health_check^(self^):
echo         """Send health check response"""
echo         response = {
echo             "status": "healthy",
echo             "service": "SentinelAI Backend",
echo             "environment": "vercel",
echo             "timestamp": "2024-02-02T21:03:00Z"
echo         }
echo         self.send_json_response^(200, response^)
echo.
echo     def send_settings^(self^):
echo         """Send settings response"""
echo         settings = {
echo             "warn_threshold": 0.3,
echo             "escalate_threshold": 0.7,
echo             "confidence_floor": 0.5,
echo             "signal_weights": {
echo                 "prompt_anomaly": 0.3,
echo                 "jailbreak_attempt": 0.4,
echo                 "unsafe_output": 0.3
echo             },
echo             "enforcement_mode": "warn",
echo             "version": 1
echo         }
echo         self.send_json_response^(200, settings^)
echo.
echo     def handle_analyze_external^(self^):
echo         """Handle analyze external request"""
echo         try:
echo             # Read request body
echo             content_length = int^(self.headers['Content-Length']^)
echo             post_data = self.rfile.read^(content_length^)
echo.
echo             # Parse JSON
echo             try:
echo                 data = json.loads^(post_data.decode^('utf-8'^)^)
echo             except json.JSONDecodeError:
echo                 self.send_json_response^(400, {"error": "Invalid JSON"}^)
echo                 return
echo.
echo             # Validate required fields
echo             prompt = data.get^("prompt", ""^)
echo             response_text = data.get^("response", ""^)
echo.
echo             if not prompt or not response_text:
echo                 self.send_json_response^(400, {"error": "prompt and response are required"}^)
echo                 return
echo.
echo             # Calculate risk score ^(simplified for Vercel^)
echo             risk_score = self.calculate_risk_score^(prompt, response_text^)
echo             decision = "allow" if risk_score ^< 0.5 else "warn" if risk_score ^< 0.8 else "block"
echo.
echo             # Build response
echo             result = {
echo                 "final_risk_score": risk_score,
echo                 "decision": decision,
echo                 "risk_flags": [],
echo                 "analysis_timestamp": "2024-02-02T21:03:00Z",
echo                 "source": data.get^("source", "unknown"^),
echo                 "user_id": data.get^("user_id", "anonymous"^),
echo                 "session_id": data.get^("session_id", "unknown"^)
echo             }
echo.
echo             self.send_json_response^(200, result^)
echo.
echo         except Exception as e:
echo             logger.error^(f"Error in analyze_external: {str^(e^)}"^)
echo             self.send_json_response^(500, {"error": "Internal server error"}^)
echo.
echo     def calculate_risk_score^(self, prompt: str, response_text: str^) -^> float:
echo         """Simplified risk calculation for Vercel"""
echo         high_risk_keywords = [
echo             "password", "admin", "hack", "bypass", "exploit", 
echo             "illegal", "harmful", "dangerous", "weapon", "drugs"
echo         ]
echo.
echo         medium_risk_keywords = [
echo             "access", "privileges", "credentials", "login", "account"
echo         ]
echo.
echo         text = ^(prompt + " " + response_text^).lower^(^)
echo.
echo         # Calculate risk score
echo         risk_score = 0.1  # Base risk
echo.
echo         for keyword in high_risk_keywords:
echo             if keyword in text:
echo                 risk_score += 0.3
echo.
echo         for keyword in medium_risk_keywords:
echo             if keyword in text:
echo                 risk_score += 0.15
echo.
echo         # Cap at 1.0
echo         return min^(risk_score, 1.0^)
echo.
echo     def send_json_response^(self, status_code: int, data: Dict[str, Any]^):
echo         """Send JSON response"""
echo         self.send_response^(status_code^)
echo         self.send_header^('Content-Type', 'application/json'^)
echo         self.send_header^('Access-Control-Allow-Origin', '*'^)
echo         self.send_header^('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS'^)
echo         self.send_header^('Access-Control-Allow-Headers', 'Content-Type, Authorization'^)
echo         self.end_headers^(^)
echo.
echo         response_json = json.dumps^(data, indent=2^)
echo         self.wfile.write^(response_json.encode^('utf-8'^)^)
echo """
) > api\index.py

echo ✅ Backend setup completed
cd ..

REM Step 2: Setup Frontend for Vercel
echo.
echo 📦 Setting up Frontend for Vercel...
cd Frontend

REM Install dependencies
echo 📥 Installing frontend dependencies...
call npm install

REM Use Vercel configuration
echo 🔧 Using Vercel Next.js configuration...
copy next.config.vercel.js next.config.js

REM Create Vercel environment file
echo 🔧 Creating Vercel environment file...
(
echo NEXT_PUBLIC_API_URL=https://your-vercel-app-name.vercel.app/api
echo NEXT_PUBLIC_ENVIRONMENT=production
) > .env.local

echo ✅ Frontend setup completed
cd ..

REM Step 3: Deploy to Vercel
echo.
echo 🚀 Deploying to Vercel...

REM Deploy frontend
echo 🌐 Deploying Frontend to Vercel...
cd Frontend
vercel --prod

echo.
echo ✅ Vercel Deployment Completed Successfully!
echo ==================================================
echo.
echo 📱 Your SentinelAI MVP is now live at:
echo    https://your-vercel-app-name.vercel.app
echo.
echo ⚡ Backend API Endpoints:
echo    - Health Check: https://your-vercel-app-name.vercel.app/api/health
echo    - Analyze: https://your-vercel-app-name.vercel.app/api/analyze/external
echo    - Settings: https://your-vercel-app-name.vercel.app/api/settings
echo.
echo 📊 Vercel Dashboard:
echo    https://vercel.com/dashboard
echo.
echo 🎉 Your SentinelAI MVP is now live on Vercel!

pause
