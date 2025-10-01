# Queue System Setup Checklist

Complete these steps to get the queue system running.

---

## ✅ **Step 1: Database Migration** (5 minutes)

### Option A: Via Supabase Dashboard (Recommended)
1. Go to: https://supabase.com/dashboard/project/YOUR_PROJECT/sql
2. Click "New query"
3. Copy and paste: `supabase/migrations/20250101000001_create_ingestion_jobs_safe.sql`
4. Click "Run"
5. Verify: Should see success messages

### Option B: Via CLI
```bash
supabase db push
```

### Verify Migration Worked
Run this query in SQL Editor:
```sql
-- Should return the ingestion_jobs table structure
SELECT * FROM ingestion_jobs LIMIT 1;

-- Should return 3 functions
SELECT proname FROM pg_proc 
WHERE proname IN ('get_pending_jobs', 'reset_stale_jobs', 'get_job_stats');
```

---

## ✅ **Step 2: Create Supabase Storage Bucket** (2 minutes)

1. Go to: https://supabase.com/dashboard/project/YOUR_PROJECT/storage/buckets
2. Click "Create bucket"
3. Configure:
   - **Name:** `documents`
   - **Bucket type:** Standard bucket (S3 compatible) ✅
   - **Public bucket:** ❌ UNCHECKED (keep private)
   - **Restrict file size:** ✅ CHECKED
     - Max size: 52428800 bytes (50MB)
   - **Restrict MIME types:** ✅ CHECKED (optional but recommended)
     - Add: `application/pdf`, `text/plain`, `text/csv`, `application/msword`, `application/vnd.openxmlformats-officedocument.wordprocessingml.document`
4. Click "Create bucket"

### Add Storage Policies (CRITICAL - or files won't upload!)

Go to Storage > Policies > Create policy for `documents` bucket:

**Policy 1: Allow authenticated users to upload their tenant's files**
```sql
-- Policy name: "Tenant users can upload"
-- Operation: INSERT
-- Target roles: authenticated

-- Policy definition:
(bucket_id = 'documents'::text) AND 
(auth.role() = 'authenticated'::text) AND 
((storage.foldername(name))[1] = (
  SELECT tenant_id::text 
  FROM users 
  WHERE id = auth.uid()
))
```

**Policy 2: Allow service role to do anything**
```sql
-- Policy name: "Service role has full access"
-- Operation: SELECT, INSERT, UPDATE, DELETE
-- Target roles: service_role

-- Policy definition:
(bucket_id = 'documents'::text)
```

**Policy 3: Allow users to read their tenant's files**
```sql
-- Policy name: "Tenant users can read"
-- Operation: SELECT
-- Target roles: authenticated

-- Policy definition:
(bucket_id = 'documents'::text) AND 
((storage.foldername(name))[1] = (
  SELECT tenant_id::text 
  FROM users 
  WHERE id = auth.uid()
))
```

---

## ✅ **Step 3: Set Environment Variables** (3 minutes)

### Local Development (.env.local)
```bash
# Queue System
CRON_SECRET=7K9mP2xQ8vL4nR6wY3sT1hF5jD0bV9zA

# Worker Configuration (optional - these are defaults)
WORKER_GLOBAL_MAX=10
WORKER_PER_TENANT_MAX=2
WORKER_STALE_TIMEOUT=5
```

### Vercel (Production)
1. Go to: https://vercel.com/YOUR_ORG/YOUR_PROJECT/settings/environment-variables
2. Add:
   - **Key:** `CRON_SECRET`
   - **Value:** `7K9mP2xQ8vL4nR6wY3sT1hF5jD0bV9zA`
   - **Environment:** Production, Preview, Development (all 3)
3. Click "Save"

---

## ✅ **Step 4: Deploy to Vercel** (2 minutes)

```bash
# Commit changes
git add -A
git commit -m "Setup: Queue system environment variables"
git push origin main

# Deploy will trigger automatically
# Or manually:
vercel --prod
```

### Verify Cron is Configured
```bash
# Check cron jobs
vercel crons ls

# Should show:
# Path: /api/queue/worker
# Schedule: * * * * * (every 1 minute)
```

---

## ✅ **Step 5: Test the System** (10 minutes)

### Test 1: Presigned Upload API
```bash
curl -X POST https://your-domain.com/api/queue/presigned-upload \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN" \
  -d '{
    "filename": "test.txt",
    "file_type": "text/plain",
    "file_size": 100
  }'

# Should return: { "upload_url": "...", "file_path": "...", "token": "..." }
```

### Test 2: Upload a Small File via UI
1. Go to your documents page
2. Drag and drop a small text file (< 1MB)
3. Watch the upload progress
4. Check the jobs dashboard

### Test 3: Check Database
```sql
-- View all jobs
SELECT id, filename, status, attempts, created_at
FROM ingestion_jobs
ORDER BY created_at DESC
LIMIT 10;

-- Should see your test file
```

### Test 4: Trigger Worker Manually
```bash
curl -X POST https://your-domain.com/api/queue/worker \
  -H "Authorization: Bearer 7K9mP2xQ8vL4nR6wY3sT1hF5jD0bV9zA"

# Should return: { "processed": N, "jobs": [...] }
```

### Test 5: Check Vercel Logs
```bash
vercel logs --follow

# Should see:
# 🔄 [WORKER] Starting job processing cycle...
# ✅ [WORKER] Cycle complete: N jobs started
```

---

## ✅ **Step 6: Monitor & Debug** (Ongoing)

### Check Job Status
```sql
-- Get stats
SELECT * FROM get_job_stats('YOUR_TENANT_ID');

-- View pending jobs
SELECT * FROM ingestion_jobs WHERE status = 'pending';

-- View failed jobs
SELECT filename, error_message, attempts
FROM ingestion_jobs 
WHERE status = 'failed'
ORDER BY created_at DESC;
```

### Common Issues

**Issue: Jobs stuck in "pending"**
```sql
-- Check if worker is running
SELECT * FROM ingestion_jobs 
WHERE status = 'processing' 
ORDER BY started_at DESC 
LIMIT 5;

-- If none processing, cron might not be working
-- Check: vercel crons ls
```

**Issue: Jobs stuck in "processing"**
```sql
-- Manually reset stale jobs
SELECT * FROM reset_stale_jobs(5);

-- Check error logs
SELECT filename, error_message, error_stack
FROM ingestion_jobs
WHERE status = 'processing'
  AND started_at < NOW() - INTERVAL '5 minutes';
```

**Issue: Upload fails with 403**
```
Problem: Storage bucket policies not set correctly
Fix: Go back to Step 2 and add the RLS policies
```

---

## 🎯 **Success Criteria**

You'll know it's working when:
- ✅ Files upload in 1-2 seconds
- ✅ Jobs appear in database immediately with status "pending"
- ✅ Within 1 minute, jobs change to "processing"
- ✅ Within 30 seconds, jobs change to "completed"
- ✅ Dashboard shows real-time statistics
- ✅ No errors in Vercel logs

---

## 📊 **What to Monitor**

### Daily
- Check failed job count: `SELECT COUNT(*) FROM ingestion_jobs WHERE status = 'failed'`
- Check average processing time
- Check stale jobs: Jobs in "processing" > 5 minutes

### Weekly
- Review error messages
- Check storage usage: Supabase Dashboard > Storage
- Optimize worker concurrency if needed

---

## 🔧 **Optional: Add File Cleanup**

If you want to delete original files after processing (privacy):

```typescript
// In app/api/queue/worker/route.ts
// After successful processing (line ~250):

// Delete original file from storage
try {
  await supabase.storage
    .from('documents')
    .remove([job.file_path]);
  
  console.log(`🗑️ [JOB ${job.id}] Deleted original file for privacy`);
} catch (error) {
  console.warn(`⚠️ [JOB ${job.id}] Failed to delete file:`, error);
  // Don't fail the job if deletion fails
}
```

---

## 🎓 **You're Done!**

Your queue system is now:
- ✅ Processing files in background
- ✅ Handling failures with retry
- ✅ Isolated per tenant
- ✅ Fully monitored
- ✅ Production-ready

**Next:** Test with 5-10 files simultaneously to verify concurrency works!

