# 🗄️ Render PostgreSQL Setup Guide

## 🚀 Connect Render PostgreSQL to SentinelAI Backend

### Step 1: Create PostgreSQL Database

1. **Go to Render Dashboard**
2. Click **New** → **PostgreSQL**
3. **Configure Database**:
   ```
   Name: sentinelai-db
   Database Name: sentinelai
   User: sentinelai_user
   Plan: Free (for development)
   Region: Same as your backend service
   ```
4. Click **Create Database**

### Step 2: Get Connection Details

After creation, Render will show:
- **Internal Database URL** (for services in same region)
- **External Database URL** (for external connections)

**Copy the Internal Database URL** - it looks like:
```
postgresql://sentinelai_user:password@host:5432/sentinelai
```

### Step 3: Connect Backend to Database

#### Option A: Manual Connection (Recommended)

1. **Go to your backend service on Render**
2. Click **Environment** tab
3. **Add Environment Variable**:
   ```
   Key: DATABASE_URL
   Value: postgresql://sentinelai_user:password@host:5432/sentinelai
   ```
4. **Add more variables** (optional):
   ```
   Key: ENVIRONMENT
   Value: production
   ```

#### Option B: Automatic Connection

1. In your backend service, click **Connect** → **Database**
2. Select your `sentinelai-db`
3. Render automatically adds `DATABASE_URL`

### Step 4: Deploy Backend

1. **Push changes** to trigger deployment:
   ```bash
   git add .
   git commit -m "Add PostgreSQL support"
   git push
   ```

2. **Monitor deployment** in Render dashboard

### Step 5: Verify Database Connection

#### Test Health Check
```bash
curl https://your-backend.onrender.com/api/health
```

#### Check Database Tables
1. Go to Render PostgreSQL dashboard
2. Click **Table Editor**
3. You should see tables: `risk_logs`, `prompt_baselines`, `settings`

### 📋 Configuration Files Updated

#### `app/storage/db.py`
- ✅ Auto-detects PostgreSQL vs SQLite
- ✅ Uses `DATABASE_URL` environment variable
- ✅ Proper PostgreSQL connection handling

#### `requirements.txt`
- ✅ Added `psycopg2-binary` for PostgreSQL

### 🔧 Database Features

#### Automatic Table Creation
- SQLAlchemy creates tables automatically on first run
- Seeds default settings if missing

#### Data Persistence
- All risk logs saved to PostgreSQL
- Settings persist across deployments
- Baselines stored permanently

#### Backup & Restore
- Render provides automatic backups
- Can export data anytime
- Point-in-time recovery available

### 🧪 Testing Database

#### Create Test Data
```bash
curl -X POST https://your-backend.onrender.com/api/analyze/external \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Test prompt",
    "response": "Test response",
    "source": "test-app",
    "user_id": "test-user",
    "session_id": "test-session"
  }'
```

#### Check Settings
```bash
curl https://your-backend.onrender.com/api/settings
```

### 🚨 Troubleshooting

#### Connection Issues
1. **Check DATABASE_URL format**
2. **Verify database is running**
3. **Ensure same region** for backend and database
4. **Check Render service logs**

#### Migration Issues
1. **Delete and recreate database** if needed
2. **Clear backend service cache**
3. **Redeploy backend**

#### Performance Issues
1. **Monitor database metrics** in Render dashboard
2. **Add database indexes** if needed
3. **Upgrade to paid plan** for better performance

### 📊 Monitoring

#### Database Metrics
- Connections
- Storage usage
- Query performance
- Backup status

#### Backend Logs
- Database connection logs
- Query logs
- Error logs

### 🔄 CI/CD Integration

#### Automatic Deployments
- Database connection works automatically
- No manual intervention needed
- Zero-downtime deployments

#### Environment Separation
- Development: SQLite (local)
- Production: PostgreSQL (Render)

---

## 🎯 Benefits of Render PostgreSQL

✅ **Persistent Storage** - Data survives deployments  
✅ **Automatic Backups** - Daily backups included  
✅ **SSL Encryption** - Secure connections  
✅ **Scalable** - Upgrade as needed  
✅ **Easy Integration** - One-click connection  
✅ **Free Tier** - 256MB storage free  

---

## 🎉 Complete Setup

Your SentinelAI backend now has:
- ✅ **Render PostgreSQL database**
- ✅ **Persistent data storage**
- ✅ **Automatic backups**
- ✅ **Production-ready configuration**

**🚀 Your full-stack app is now production-ready with persistent database!**
