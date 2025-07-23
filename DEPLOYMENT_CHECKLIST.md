# Deployment Checklist - Backend Supabase Integration

## ✅ CRITICAL: Backend Environment Variables (Vercel Dashboard)

**Go to Vercel Project → Settings → Environment Variables**

### Required Variables:
```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...
GOOGLE_AI_API_KEY=AIzaSyC...
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...
```

### How to Find These Values:

1. **NEXT_PUBLIC_SUPABASE_URL**: 
   - Go to Supabase Dashboard → Project Settings → API
   - Copy "Project URL"

2. **SUPABASE_SERVICE_ROLE_KEY**:
   - Go to Supabase Dashboard → Project Settings → API
   - Copy "service_role" key (NOT the anon key)
   - ⚠️ CRITICAL: This gives admin access - keep secret!

3. **NEXT_PUBLIC_SUPABASE_ANON_KEY**:
   - Go to Supabase Dashboard → Project Settings → API  
   - Copy "anon public" key

4. **GOOGLE_AI_API_KEY**:
   - Go to Google AI Studio → Get API Key
   - Or Google Cloud Console → APIs & Services → Credentials

## ✅ Database Setup (Supabase SQL Editor)

**Run this migration in Supabase SQL Editor:**

```sql
-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create similarity_search function
CREATE OR REPLACE FUNCTION similarity_search(
  query_embedding vector(768),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 5,
  tenant_id text DEFAULT NULL,
  access_level int DEFAULT 1
)
RETURNS TABLE (
  id uuid,
  content text,
  similarity float,
  document_id uuid,
  chunk_index int
)
LANGUAGE sql STABLE
AS $$
  SELECT
    dc.id,
    dc.content,
    1 - (dc.embedding <=> query_embedding) as similarity,
    dc.document_id,
    dc.chunk_index
  FROM document_chunks as dc
  WHERE 
    (similarity_search.tenant_id IS NULL OR dc.metadata->>'tenant_id' = similarity_search.tenant_id)
    AND (dc.access_level IS NULL OR dc.access_level <= similarity_search.access_level)
    AND 1 - (dc.embedding <=> query_embedding) > match_threshold
  ORDER BY dc.embedding <=> query_embedding
  LIMIT match_count;
$$;

-- Add access_level column if missing
ALTER TABLE document_chunks
ADD COLUMN IF NOT EXISTS access_level INTEGER DEFAULT 1 CHECK (access_level BETWEEN 1 AND 5);
```

## ✅ Verification Steps

1. **Check Health Endpoint**:
   ```
   GET https://your-app.vercel.app/api/health
   ```
   Should return:
   ```json
   {
     "status": "ok",
     "services": {
       "supabase": "ok",
       "google_ai": "configured"
     }
   }
   ```

2. **Test Subdomain Routing**:
   ```
   https://demo.your-app.vercel.app
   ```
   Should show your app interface, not "Subdomain Not Found"

3. **Verify Database Connection**:
   - Go to Supabase → Table Editor
   - Check that tables exist: `documents`, `document_chunks`, `search_history`

## ✅ Common Issues & Fixes

### Issue: "Subdomain Not Found"
**Cause**: Backend can't connect to database to check tenant
**Fix**: Add environment variables above

### Issue: Health check 404
**Cause**: API routes not deploying
**Fix**: Redeploy after adding environment variables

### Issue: "Database service not available"  
**Cause**: Wrong Supabase URL or missing service role key
**Fix**: Double-check environment variables

## ✅ Frontend Integration (Secondary Priority)

**Only after backend works:**

1. **Frontend Environment Variables** (if using client-side Supabase):
   ```bash
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...
   ```

2. **API Client Configuration**:
   ```typescript
   // Frontend calls backend APIs
   const response = await fetch('/api/chat', {
     method: 'POST',
     body: JSON.stringify({ message: 'Hello' })
   });
   ```

## 🚨 Security Notes

- **NEVER** put service_role key in frontend code
- **ALWAYS** use anon key for frontend
- **Backend APIs** handle all database operations
- **Row Level Security** protects tenant data

---

**Priority Order: Backend → Database → Frontend → UI Polish** 