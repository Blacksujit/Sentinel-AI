#!/bin/bash

# Firebase Deployment Script for SentinelAI MVP
# This script handles the complete deployment process

set -e  # Exit on any error

echo "🚀 Starting Firebase Deployment for SentinelAI MVP"
echo "=================================================="

# Check if Firebase CLI is installed
if ! command -v firebase &> /dev/null; then
    echo "❌ Firebase CLI not found. Installing..."
    npm install -g firebase-tools
fi

# Check if user is logged in to Firebase
if ! firebase projects:list &> /dev/null; then
    echo "🔐 Please login to Firebase:"
    firebase login
fi

# Step 1: Build Frontend for Firebase
echo ""
echo "📦 Building Frontend for Firebase..."
cd Frontend

# Install dependencies
echo "📥 Installing frontend dependencies..."
npm install

# Build with Firebase configuration
echo "🔨 Building Next.js app for Firebase..."
cp next.config.firebase.js next.config.js
npm run build

# Verify build
if [ ! -d "out" ]; then
    echo "❌ Build failed - 'out' directory not found"
    exit 1
fi

echo "✅ Frontend build completed"
cd ..

# Step 2: Prepare Backend for Firebase Functions
echo ""
echo "🔧 Preparing Backend for Firebase Functions..."
cd Backend

# Create functions directory if it doesn't exist
mkdir -p functions

# Copy main Firebase function
echo "📋 Copying Firebase functions..."
cp main_firebase.py functions/main.py

# Copy requirements
echo "📋 Copying requirements..."
cp requirements-firebase.txt functions/requirements.txt

# Create __init__.py
touch functions/__init__.py

echo "✅ Backend preparation completed"
cd ..

# Step 3: Deploy to Firebase
echo ""
echo "🌍 Deploying to Firebase..."

# Deploy functions first
echo "⚡ Deploying Firebase Functions..."
firebase deploy --only functions

# Deploy hosting
echo "🌐 Deploying Firebase Hosting..."
firebase deploy --only hosting

# Full deployment
echo "🚀 Full Firebase deployment..."
firebase deploy

echo ""
echo "✅ Firebase Deployment Completed Successfully!"
echo "=================================================="
echo ""
echo "📱 Your SentinelAI MVP is now live at:"
echo "   https://sentinelai-mvp.web.app"
echo "   https://sentinelai-mvp.firebaseapp.com"
echo ""
echo "⚡ Backend Functions URL:"
echo "   https://us-central1-sentinelai-mvp.cloudfunctions.net"
echo ""
echo "🔧 API Endpoints:"
echo "   - Health Check: https://us-central1-sentinelai-mvp.cloudfunctions.net/health_check"
echo "   - Analyze: https://us-central1-sentinelai-mvp.cloudfunctions.net/analyze_external"
echo "   - Settings: https://us-central1-sentinelai-mvp.cloudfunctions.net/get_settings"
echo ""
echo "📊 Firebase Console:"
echo "   https://console.firebase.google.com/project/sentinelai-mvp"
echo ""
echo "🎉 Your SentinelAI MVP is now live on Firebase!"
