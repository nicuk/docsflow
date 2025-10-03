-- Check queue worker status and job details
-- Run this to see why jobs aren't being processed

-- 1. Check all ingestion jobs
SELECT 
  id,
  filename,
  status,
  attempts,
  max_attempts,
  created_at,
  started_at,
  completed_at,
  error_message,
  EXTRACT(EPOCH FROM (NOW() - created_at)) / 60 as minutes_since_created
FROM ingestion_jobs
WHERE tenant_id = 'b89b8fab-0a25-4266-a4d0-306cc4d358cb'
ORDER BY created_at DESC;

-- 2. Check corresponding documents
SELECT 
  d.id,
  d.filename,
  d.processing_status,
  d.processing_progress,
  d.created_at,
  (SELECT COUNT(*) FROM document_chunks WHERE document_id = d.id) as chunk_count
FROM documents d
WHERE d.tenant_id = 'b89b8fab-0a25-4266-a4d0-306cc4d358cb'
ORDER BY d.created_at DESC;

-- 3. Check if jobs are visible to worker
SELECT 
  'Jobs pending for worker' as check_type,
  COUNT(*) as job_count,
  MIN(created_at) as oldest_pending,
  MAX(created_at) as newest_pending
FROM ingestion_jobs
WHERE status = 'pending'
  AND tenant_id = 'b89b8fab-0a25-4266-a4d0-306cc4d358cb';

