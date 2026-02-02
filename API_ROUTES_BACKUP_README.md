# 🚀 Temporary API Routes Backup

# This folder contains API routes that are causing Vercel deployment issues
# They will be restored after frontend deployment

# API Routes that need to be temporarily moved:
- Frontend/app/api/analyze/route.ts
- Frontend/app/api/baselines/route.ts  
- Frontend/app/api/baselines/[id]/route.ts
- Frontend/app/api/logs/route.ts
- Frontend/app/api/logs/[id]/route.ts
- Frontend/app/api/settings/route.ts
- Frontend/app/api/settings/history/route.ts
- Frontend/app/api/settings/reset/route.ts

# These will be moved to: Frontend/app/api-backup/
