@echo off
REM Firebase Deployment Script for SentinelAI MVP (Windows)
REM This script handles the complete deployment process

echo 🚀 Starting Firebase Deployment for SentinelAI MVP
echo ==================================================

REM Check if Firebase CLI is installed
firebase --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Firebase CLI not found. Installing...
    npm install -g firebase-tools
)

REM Check if user is logged in to Firebase
firebase projects:list >nul 2>&1
if %errorlevel% neq 0 (
    echo 🔐 Please login to Firebase:
    firebase login
)

REM Step 1: Build Frontend for Firebase
echo.
echo 📦 Building Frontend for Firebase...
cd Frontend

REM Install dependencies
echo 📥 Installing frontend dependencies...
call npm install

REM Build with Firebase configuration
echo 🔨 Building Next.js app for Firebase...
copy next.config.firebase.js next.config.js
call npm run build

REM Verify build
if not exist "out" (
    echo ❌ Build failed - 'out' directory not found
    exit /b 1
)

echo ✅ Frontend build completed
cd ..

REM Step 2: Prepare Backend for Firebase Functions
echo.
echo 🔧 Preparing Backend for Firebase Functions...
cd Backend

REM Create functions directory if it doesn't exist
if not exist "functions" mkdir functions

REM Copy main Firebase function
echo 📋 Copying Firebase functions...
copy main_firebase.py functions\main.py

REM Copy requirements
echo 📋 Copying requirements...
copy requirements-firebase.txt functions\requirements.txt

REM Create __init__.py
echo. > functions\__init__.py

echo ✅ Backend preparation completed
cd ..

REM Step 3: Deploy to Firebase
echo.
echo 🌍 Deploying to Firebase...

REM Deploy functions first
echo ⚡ Deploying Firebase Functions...
firebase deploy --only functions

REM Deploy hosting
echo 🌐 Deploying Firebase Hosting...
firebase deploy --only hosting

REM Full deployment
echo 🚀 Full Firebase deployment...
firebase deploy

echo.
echo ✅ Firebase Deployment Completed Successfully!
echo ==================================================
echo.
echo 📱 Your SentinelAI MVP is now live at:
echo    https://sentinelai-mvp.web.app
echo    https://sentinelai-mvp.firebaseapp.com
echo.
echo ⚡ Backend Functions URL:
echo    https://us-central1-sentinelai-mvp.cloudfunctions.net
echo.
echo 🔧 API Endpoints:
echo    - Health Check: https://us-central1-sentinelai-mvp.cloudfunctions.net/health_check
echo    - Analyze: https://us-central1-sentinelai-mvp.cloudfunctions.net/analyze_external
echo    - Settings: https://us-central1-sentinelai-mvp.cloudfunctions.net/get_settings
echo.
echo 📊 Firebase Console:
echo    https://console.firebase.google.com/project/sentinelai-mvp
echo.
echo 🎉 Your SentinelAI MVP is now live on Firebase!

pause
