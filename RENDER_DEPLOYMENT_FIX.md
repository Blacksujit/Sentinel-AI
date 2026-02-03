# Render Deployment Fix

## Issue: Python Version Error

Render was still showing the old Python version (3.11) instead of the updated version (3.11.5).

## Solution: Manual Configuration

Since `render.yaml` wasn't being read properly, we'll configure manually:

### Step 1: Delete render.yaml
✅ Done - Removed `Backend/render.yaml`

### Step 2: Add runtime.txt
✅ Done - Created `Backend/runtime.txt` with `python-3.11.5`

### Step 3: Manual Render Configuration

1. **Go to Render Dashboard**
2. **Delete existing service** if it exists
3. **Create New Web Service**:
   - Repository: `Blacksujit/Sentinel-AI`
   - Root Directory: `Backend`
   - Environment: `Python`
   - **Python Version**: `3.11.5` (select from dropdown)

### Step 4: Environment Variables
Add these manually in Render dashboard:
```
PYTHON_VERSION=3.11.5
ENVIRONMENT=production
```

### Step 5: Build Settings
- **Build Command**: `pip install -r requirements.txt`
- **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`
- **Health Check Path**: `/api/health`

## Alternative: Use Render's Python Version Selection

Render has a dropdown for Python versions. Select:
- Python 3.11.5 (or latest 3.11.x available)

This bypasses any environment variable issues.

## Why This Happens

Render sometimes:
- Caches old environment variables
- Doesn't read `render.yaml` correctly
- Prefers manual configuration over YAML files

## Next Steps

1. Delete current service on Render
2. Create new service with manual configuration
3. Select Python 3.11.5 from dropdown
4. Add environment variables manually
5. Deploy
