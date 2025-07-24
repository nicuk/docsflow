# DEPLOYMENT CHECKLIST - AI Lead Router SaaS

## ✅ Pre-Deployment Requirements

### 1. Environment Variables (Vercel Dashboard)
**Critical**: Verify these environment variables are set in your Vercel project settings:

#### **Required - Core Functionality**
```bash
# Database (Supabase)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# AI Provider (Google Gemini)
GOOGLE_AI_API_KEY=AIza...

# Multi-tenant routing
NEXT_PUBLIC_ROOT_DOMAIN=ai-lead-router-saas.vercel.app
```

#### **Optional - Enhanced Features**
```bash
# Redis (for tenant metadata)
KV_REST_API_URL=redis://...
KV_REST_API_TOKEN=xxx

# Email notifications
RESEND_API_KEY=re_xxx

# Google Drive integration
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=xxx
GOOGLE_REDIRECT_URI=https://ai-lead-router-saas.vercel.app/api/auth/callback
```

### 2. Database Setup (Supabase)
Run these SQL migrations in your Supabase SQL Editor:

1. **Basic Schema**: `SUPABASE_IMPLEMENTATION.sql`
2. **Vector Search**: `migrations/001_similarity_search.sql`
3. **Security**: `migrations/002_security_hardening.sql`
4. **Vector Migration**: `migrations/003_complete_vector_migration.sql`

### 3. Domain Configuration
- Set up custom domain in Vercel (if using)
- Configure DNS records for subdomain routing
- Update CORS origins in API routes

## 🚨 Current Deployment Error

**Error**: `Application error: a server-side exception has occurred while loading ai-lead-router-saas.vercel.app`

**Most Likely Causes**:
1. **Missing Environment Variables** - Check Vercel dashboard
2. **Database Connection** - Verify Supabase credentials
3. **Missing Vector Extension** - Ensure `pgvector` is enabled

## 🔧 Quick Fixes

### Fix 1: Verify Environment Variables
```bash
# Check if all required env vars are set in Vercel:
vercel env ls
```

### Fix 2: Test Database Connection
```sql
-- Run in Supabase SQL Editor to test:
SELECT current_database(), current_user;
SELECT * FROM pg_extension WHERE extname = 'vector';
```

### Fix 3: Check Function Availability
```sql
-- Verify similarity_search function exists:
SELECT routine_name FROM information_schema.routines 
WHERE routine_name = 'similarity_search';
```

## 🎯 Success Criteria

- [ ] Build completes successfully (`npm run build`)
- [ ] All environment variables configured in Vercel
- [ ] Database schema and functions deployed
- [ ] Chat API returns 200 status (`/api/chat`)
- [ ] Subdomain routing works (`app.your-domain.com`)

## 📞 Support

If deployment still fails:
1. Check Vercel function logs
2. Verify Supabase query logs  
3. Test API endpoints individually
4. Enable debug logging (`LOG_LEVEL=debug`)

---

**Last Updated**: After Next.js 15 compatibility fixes
**Status**: Ready for deployment ✅ 