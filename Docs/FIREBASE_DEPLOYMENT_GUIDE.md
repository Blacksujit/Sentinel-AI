# 🚀 Firebase Deployment Guide for SentinelAI MVP

## 📋 Prerequisites

### **1. Firebase Account Setup**
- Create a Firebase account at [https://firebase.google.com](https://firebase.google.com)
- Create a new project: `sentinelai-mvp`
- Enable Blaze plan (free tier with pay-as-you-go)

### **2. Install Firebase CLI**
```bash
# Install Firebase CLI globally
npm install -g firebase-tools

# Login to Firebase
firebase login
```

### **3. Project Structure**
```
Sentinel-AI/
├── firebase.json              # Firebase configuration
├── .firebaserc                # Firebase project settings
├── .firebaseignore            # Files to ignore
├── deploy-firebase.sh         # Linux/Mac deployment script
├── deploy-firebase.bat        # Windows deployment script
├── Frontend/
│   ├── next.config.firebase.js # Firebase Next.js config
│   └── out/                   # Build output (generated)
└── Backend/
    ├── main_firebase.py        # Firebase Functions entry point
    ├── requirements-firebase.txt # Firebase Functions requirements
    └── functions/             # Firebase Functions source
        ├── main.py
        ├── requirements.txt
        └── __init__.py
```

## 🔧 Configuration Setup

### **1. Firebase Project Configuration**
```json
// .firebaserc
{
  "projects": {
    "default": "sentinelai-mvp"
  }
}
```

### **2. Firebase Hosting Configuration**
```json
// firebase.json
{
  "hosting": {
    "public": "Frontend/out",
    "ignore": [
      "firebase.json",
      "**/.*",
      "**/node_modules/**"
    ],
    "rewrites": [
      {
        "source": "**",
        "destination": "/index.html"
      }
    ]
  },
  "functions": {
    "source": "Backend/functions",
    "predeploy": [
      "pip install -r Backend/requirements-firebase.txt -t Backend/functions/"
    ],
    "runtime": "python310"
  }
}
```

### **3. Frontend Configuration**
```javascript
// Frontend/next.config.firebase.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  images: {
    unoptimized: true,
  },
  basePath: '',
  assetPrefix: '',
  trailingSlash: true,
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'https://us-central1-sentinelai-mvp.cloudfunctions.net',
    NEXT_PUBLIC_ENVIRONMENT: process.env.NEXT_PUBLIC_ENVIRONMENT || 'production'
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      }
    }
    return config
  },
  reactStrictMode: true,
  swcMinify: true,
}

module.exports = nextConfig
```

## 🚀 Deployment Steps

### **Option 1: Automated Deployment (Recommended)**

#### **Windows:**
```cmd
# Run the deployment script
deploy-firebase.bat
```

#### **Linux/Mac:**
```bash
# Make script executable
chmod +x deploy-firebase.sh

# Run the deployment script
./deploy-firebase.sh
```

### **Option 2: Manual Deployment**

#### **Step 1: Build Frontend**
```bash
cd Frontend
npm install
cp next.config.firebase.js next.config.js
npm run build
cd ..
```

#### **Step 2: Prepare Backend Functions**
```bash
cd Backend
mkdir -p functions
cp main_firebase.py functions/main.py
cp requirements-firebase.txt functions/requirements.txt
touch functions/__init__.py
cd ..
```

#### **Step 3: Deploy to Firebase**
```bash
# Deploy functions first
firebase deploy --only functions

# Deploy hosting
firebase deploy --only hosting

# Or deploy everything at once
firebase deploy
```

## 🔗 Firebase URLs After Deployment

### **Frontend URLs:**
- **Primary**: `https://sentinelai-mvp.web.app`
- **Secondary**: `https://sentinelai-mvp.firebaseapp.com`

### **Backend Functions URLs:**
- **Base URL**: `https://us-central1-sentinelai-mvp.cloudfunctions.net`
- **Health Check**: `https://us-central1-sentinelai-mvp.cloudfunctions.net/health_check`
- **Analyze API**: `https://us-central1-sentinelai-mvp.cloudfunctions.net/analyze_external`
- **Settings**: `https://us-central1-sentinelai-mvp.cloudfunctions.net/get_settings`

### **Firebase Console:**
- **Console**: `https://console.firebase.google.com/project/sentinelai-mvp`

## 🔧 Environment Variables

### **Frontend Environment Variables**
```bash
# Frontend/.env.local
NEXT_PUBLIC_API_URL=https://us-central1-sentinelai-mvp.cloudfunctions.net
NEXT_PUBLIC_ENVIRONMENT=production
```

### **Backend Environment Variables (Firebase Functions)**
```python
# Backend/functions/main.py
import os

# Firebase automatically sets these
PROJECT_ID = os.environ.get('GCP_PROJECT')
FUNCTION_REGION = os.environ.get('FUNCTION_REGION')
```

## 🛠️ Firebase Functions Details

### **Available Endpoints**

#### **1. Health Check**
```http
GET /health_check
```
**Response:**
```json
{
  "status": "healthy",
  "service": "SentinelAI Backend",
  "environment": "firebase",
  "timestamp": "2024-02-02T20:40:00Z"
}
```

#### **2. Analyze External**
```http
POST /analyze_external
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
  "analysis_timestamp": "2024-02-02T20:40:00Z",
  "source": "chatbot",
  "user_id": "user123",
  "session_id": "session456"
}
```

#### **3. Get Settings**
```http
GET /get_settings
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

## 🔒 CORS Configuration

The Firebase Functions are configured to accept requests from:
- `https://sentinelai-mvp.web.app`
- `https://sentinelai-mvp.firebaseapp.com`
- `http://localhost:3000` (for development)
- `http://localhost:5000` (for testing)

## 📊 Firebase Free Tier Limits

### **Hosting (Free):**
- **Storage**: 10 GB
- **Bandwidth**: 360 MB/day
- **Builds**: 60 builds/month

### **Functions (Free):**
- **Invocations**: 125,000/month
- **Compute Time**: 40,000 GB-seconds/month
- **Outbound Network**: 10 GB/month

### **Realtime Database (Free):**
- **Storage**: 1 GB
- **Downloads**: 10 GB/month

## 🔍 Testing the Deployment

### **1. Test Frontend**
```bash
# Open the deployed URL
https://sentinelai-mvp.web.app
```

### **2. Test Backend Functions**
```bash
# Test health check
curl https://us-central1-sentinelai-mvp.cloudfunctions.net/health_check

# Test analyze endpoint
curl -X POST https://us-central1-sentinelai-mvp.cloudfunctions.net/analyze_external \
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

#### **1. Build Errors**
```bash
# Clear Next.js cache
cd Frontend
rm -rf .next
npm run build
```

#### **2. Function Deployment Errors**
```bash
# Check Firebase logs
firebase functions:log

# Redeploy functions
firebase deploy --only functions
```

#### **3. CORS Errors**
- Check that your frontend URL is in the CORS configuration
- Verify the API URL in your frontend environment variables

#### **4. Function Timeouts**
- Firebase Functions have a maximum timeout of 9 minutes
- Monitor function execution time in Firebase Console

## 🎉 Success!

After deployment, your SentinelAI MVP will be:
- **Frontend**: Live on Firebase Hosting
- **Backend**: Running on Firebase Cloud Functions
- **Database**: Using Firebase Firestore/Realtime Database
- **Monitoring**: Available in Firebase Console

**🎉 Your SentinelAI MVP is now live on Firebase!**
