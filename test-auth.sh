#!/bin/bash

# 🔐 Clerk Authentication Test Script
# This script tests the permanent authentication fix

echo "🚀 Testing Clerk Authentication Setup..."
echo "======================================"

# Test 1: Check if frontend is running
echo "📍 Test 1: Frontend Health Check"
if curl -s http://localhost:3000 > /dev/null; then
    echo "✅ Frontend is running on port 3000"
else
    echo "❌ Frontend is not accessible on port 3000"
    exit 1
fi

# Test 2: Check if backend is running
echo ""
echo "📍 Test 2: Backend Health Check"
if curl -s http://127.0.0.1:8001/api/health | grep -q "ok"; then
    echo "✅ Backend is running on port 8001"
else
    echo "❌ Backend is not accessible on port 8001"
    exit 1
fi

# Test 3: Check workspace endpoint authentication
echo ""
echo "📍 Test 3: Workspace Authentication"
response=$(curl -s -w "%{http_code}" http://127.0.0.1:8001/api/workspaces)
if [[ "$response" == *"401"* ]]; then
    echo "✅ Workspace endpoint properly requires authentication"
else
    echo "❌ Workspace endpoint authentication issue"
    echo "Response: $response"
fi

# Test 4: Check frontend console for Clerk errors
echo ""
echo "📍 Test 4: Frontend Console Check"
echo "📝 Manual check required:"
echo "   1. Open browser to http://localhost:3000"
echo "   2. Open Developer Console (F12)"
echo "   3. Look for red error messages"
echo "   4. Expected: Warning about missing Clerk key (if not configured)"
echo "   5. Not expected: 'cookies() expects to have requestAsyncStorage'"

# Test 5: Environment validation
echo ""
echo "📍 Test 5: Environment Setup"
echo "📝 Required files:"
echo "   - d:\Sentinel-AI\Frontend\.env.local"
echo "   - Should contain: NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_..."

echo ""
echo "🎯 Next Steps:"
echo "   1. If you see Clerk warnings, follow CLERK_SETUP.md"
echo "   2. Get keys from https://dashboard.clerk.com"
echo "   3. Create .env.local with your keys"
echo "   4. Restart frontend"

echo ""
echo "✅ Authentication system test completed!"
echo "📚 For detailed setup: see CLERK_SETUP.md"
