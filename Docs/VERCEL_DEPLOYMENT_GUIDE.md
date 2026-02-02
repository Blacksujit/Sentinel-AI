# 🚀 Vercel Deployment Guide for SentinelAI MVP

## 📋 Prerequisites

### **1. Vercel Account Setup**
- Create a Vercel account at [https://vercel.com](https://vercel.com)
- Connect your GitHub account (recommended)
- Choose the **Hobby** plan (free tier)

### **2. Install Vercel CLI**
```bash
# Install Vercel CLI globally
npm install -g vercel

# Login to Vercel
vercel login
```

### **3. Project Structure**
```
Sentinel-AI/
├── vercel.json               # Vercel configuration
├── deploy-vercel.sh           # Linux/Mac deployment script
├── deploy-vercel.bat          # Windows deployment script
├── Frontend/
│   ├── next.config.vercel.js # Vercel Next.js config
│   └── .env.local            # Environment variables
└── Backend/
    ├── api/index.py          # Vercel serverless function
    └── requirements.txt       # Python dependencies
```

## 🔧 Configuration Setup

### **1. Vercel Project Configuration**
```json
// vercel.json
{
  "buildCommand": "cd Frontend && npm run build",
  "outputDirectory": "Frontend/.next",
  "installCommand": "cd Frontend && npm install",
  "framework": "nextjs",
  "regions": ["sin1", "hkg1"],
  "env": {
    "NEXT_PUBLIC_API_URL": "@backend-url",
    "NEXT_PUBLIC_ENVIRONMENT": "production"
  },
  "rewrites": [
    {
      "source": "/api/(.*)",
      "destination": "/Backend/api/index.py"
    }
  ]
}
```

### **2. Frontend Configuration**
```javascript
// Frontend/next.config.vercel.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  swcMinify: true,
  reactStrictMode: true,
  
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
    NEXT_PUBLIC_ENVIRONMENT: process.env.NEXT_PUBLIC_ENVIRONMENT || 'development'
  },
  
  async rewrites() {
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    
    return [
      {
        source: '/api/:path*',
        destination: `${backendUrl}/api/:path*`,
      },
    ];
  },
  
  images: {
    domains: ['localhost'],
    formats: ['image/webp', 'image/avif'],
  },
  
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }
    return config;
  },
};

module.exports = nextConfig;
```

### **3. Backend Serverless Function**
```python
# Backend/api/index.py
"""
Vercel Serverless Function for SentinelAI Backend
Optimized for Vercel's free tier
"""

import json
import logging
from http.server import BaseHTTPRequestHandler
from typing import Dict, Any

class handler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        """Handle preflight requests"""
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        self.end_headers()
    
    def do_POST(self):
        """Handle POST requests"""
        if self.path == '/api/analyze/external':
            self.handle_analyze_external()
        else:
            self.send_error(404, "Endpoint not found")
    
    def handle_analyze_external(self):
        """Handle analyze external request"""
        try:
            # Read and parse request
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            data = json.loads(post_data.decode('utf-8'))
            
            # Validate required fields
            prompt = data.get("prompt", "")
            response_text = data.get("response", "")
            
            if not prompt or not response_text:
                self.send_json_response(400, {"error": "prompt and response are required"})
                return
            
            # Calculate risk score
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
            self.send_json_response(500, {"error": "Internal server error"})
```

## 🚀 Deployment Steps

### **Option 1: Automated Deployment (Recommended)**

#### **Windows:**
```cmd
# Run the deployment script
deploy-vercel.bat
```

#### **Linux/Mac:**
```bash
# Make script executable
chmod +x deploy-vercel.sh

# Run the deployment script
./deploy-vercel.sh
```

### **Option 2: Manual Deployment**

#### **Step 1: Setup Backend**
```bash
cd Backend
mkdir -p api
# Create api/index.py with the serverless function code
# Create requirements.txt with dependencies
```

#### **Step 2: Setup Frontend**
```bash
cd Frontend
npm install
cp next.config.vercel.js next.config.js
```

#### **Step 3: Deploy to Vercel**
```bash
# Deploy from project root
vercel --prod
```

## 🔗 Vercel URLs After Deployment

### **Frontend URL:**
- **Primary**: `https://your-app-name.vercel.app`

### **Backend API Endpoints:**
- **Base URL**: `https://your-app-name.vercel.app/api`
- **Health Check**: `/api/health`
- **Analyze API**: `/api/analyze/external`
- **Settings**: `/api/settings`

### **Vercel Dashboard:**
- **Dashboard**: `https://vercel.com/dashboard`

## 🔧 Environment Variables

### **Frontend Environment Variables**
```bash
# Frontend/.env.local
NEXT_PUBLIC_API_URL=https://your-app-name.vercel.app/api
NEXT_PUBLIC_ENVIRONMENT=production
```

### **Vercel Environment Variables**
Set these in your Vercel dashboard:
- `NEXT_PUBLIC_API_URL`: `https://your-app-name.vercel.app/api`
- `NEXT_PUBLIC_ENVIRONMENT`: `production`

## 🛠️ Vercel Functions Details

### **Available Endpoints**

#### **1. Health Check**
```http
GET /api/health
```
**Response:**
```json
{
  "status": "healthy",
  "service": "SentinelAI Backend",
  "environment": "vercel",
  "timestamp": "2024-02-02T21:03:00Z"
}
```

#### **2. Analyze External**
```http
POST /api/analyze/external
Content-Type: application/json

{
  "prompt": "User message",
  "response": "AI response",
  "source": "chatbot",
  "user_id": "user123",
  "session_id": "session456"
}
```
**Response:**
```json
{
  "final_risk_score": 0.2,
  "decision": "allow",
  "risk_flags": [],
  "analysis_timestamp": "2024-02-02T21:03:00Z",
  "source": "chatbot",
  "user_id": "user123",
  "session_id": "session456"
}
```

#### **3. Get Settings**
```http
GET /api/settings
```
**Response:**
```json
{
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
```

## 📊 Vercel Free Tier Limits

### **Hobby Plan (Free):**
- **Bandwidth**: 100 GB/month
- **Function Invocations**: 100,000/month
- **Function Duration**: 10 seconds max
- **Build Time**: 6000 minutes/month
- **Edge Functions**: 100,000 invocations/month
- **Serverless Function**: 100GB-hours/month

### **Perfect for MVP:**
- Handles thousands of users free
- Global CDN included
- Automatic HTTPS
- Custom domains supported
- Git integration

## 🔍 Testing the Deployment

### **1. Test Frontend**
```bash
# Open the deployed URL
https://your-app-name.vercel.app
```

### **2. Test Backend Functions**
```bash
# Test health check
curl https://your-app-name.vercel.app/api/health

# Test analyze endpoint
curl -X POST https://your-app-name.vercel.app/api/analyze/external \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Hello",
    "response": "Hi there!",
    "source": "test",
    "user_id": "test123",
    "session_id": "session456"
  }'
```

## 🚨 Troubleshooting

### **Common Issues:**

#### **1. Function Timeout**
```bash
# Check function logs in Vercel dashboard
# Optimize function execution time
# Use Vercel's Edge Functions for faster response
```

#### **2. CORS Errors**
```bash
# Check CORS headers in serverless function
# Verify frontend API URL configuration
# Test with different origins
```

#### **3. Build Errors**
```bash
# Clear Next.js cache
cd Frontend
rm -rf .next
npm run build
```

#### **4. Environment Variables**
```bash
# Check Vercel dashboard environment variables
# Verify .env.local configuration
# Redeploy after changing variables
```

## 🎉 Success!

After deployment, your SentinelAI MVP will be:
- **Frontend**: Live on Vercel Hosting
- **Backend**: Running on Vercel Serverless Functions
- **Monitoring**: Available in Vercel Dashboard
- **Global CDN**: Fast content delivery worldwide

**🎉 Your SentinelAI MVP is now live on Vercel!**
