-- ============================================
-- UPLOAD DIAGNOSTICS - Run this anytime to check file processing
-- ============================================

-- 1️⃣ OVERALL STATUS CHECK
-- Shows all recent documents and their current status
SELECT 
    d.id,
    d.filename,
    d.file_size,
    d.mime_type,
    d.processing_status,
    d.created_at,
    d.updated_at,
    ROUND(EXTRACT(EPOCH FROM (COALESCE(d.updated_at, NOW()) - d.created_at))) as processing_seconds,
    d.metadata->>'chunk_count' as chunks,
    d.metadata->>'parse_method' as parser,
    d.metadata->>'error' as error_message
FROM documents d
WHERE d.tenant_id = 'b89b8fab-0a25-4266-a4d0-306cc4d358cb' -- Replace with your tenant_id
ORDER BY d.created_at DESC
LIMIT 20;

-- 2️⃣ JOB STATUS CHECK
-- Shows ingestion jobs and their status
SELECT 
    j.id,
    j.filename,
    j.file_type,
    j.status,
    j.attempts,
    j.created_at,
    j.started_at,
    j.completed_at,
    j.error_message,
    ROUND(EXTRACT(EPOCH FROM (COALESCE(j.completed_at, NOW()) - j.created_at))) as total_seconds,
    j.processing_metadata
FROM ingestion_jobs j
WHERE j.tenant_id = 'b89b8fab-0a25-4266-a4d0-306cc4d358cb' -- Replace with your tenant_id
ORDER BY j.created_at DESC
LIMIT 20;

-- 3️⃣ DOCUMENT + JOB CORRELATION
-- Shows the relationship between documents and their jobs
SELECT 
    d.filename,
    d.processing_status as doc_status,
    j.status as job_status,
    j.attempts,
    d.metadata->>'chunk_count' as chunks,
    d.metadata->>'parse_method' as parser,
    j.error_message,
    d.created_at as doc_created,
    j.created_at as job_created,
    j.completed_at as job_completed
FROM documents d
LEFT JOIN ingestion_jobs j ON d.id = j.document_id
WHERE d.tenant_id = 'b89b8fab-0a25-4266-a4d0-306cc4d358cb' -- Replace with your tenant_id
ORDER BY d.created_at DESC
LIMIT 20;

-- 4️⃣ STUCK/FAILED UPLOADS
-- Identifies problematic uploads
SELECT 
    d.id,
    d.filename,
    d.processing_status,
    d.created_at,
    AGE(NOW(), d.created_at) as time_since_upload,
    j.status as job_status,
    j.attempts,
    j.error_message,
    d.metadata->>'error' as doc_error
FROM documents d
LEFT JOIN ingestion_jobs j ON d.id = j.document_id
WHERE d.tenant_id = 'b89b8fab-0a25-4266-a4d0-306cc4d358cb' -- Replace with your tenant_id
  AND (
    d.processing_status = 'pending' OR
    d.processing_status = 'error' OR
    j.status = 'failed' OR
    (d.processing_status = 'processing' AND d.created_at < NOW() - INTERVAL '5 minutes')
  )
ORDER BY d.created_at DESC;

-- 5️⃣ IMAGE PROCESSING CHECK
-- Specifically checks how images are being processed
SELECT 
    d.filename,
    d.file_size,
    d.mime_type,
    d.processing_status,
    d.metadata->>'chunk_count' as chunks,
    d.metadata->>'parse_method' as parser,
    d.metadata->>'ocrEngine' as ocr_engine,
    j.error_message,
    d.created_at
FROM documents d
LEFT JOIN ingestion_jobs j ON d.id = j.document_id
WHERE d.tenant_id = 'b89b8fab-0a25-4266-a4d0-306cc4d358cb' -- Replace with your tenant_id
  AND d.mime_type LIKE 'image/%'
ORDER BY d.created_at DESC
LIMIT 10;

-- 6️⃣ BINARY GARBAGE DETECTION
-- Detects documents that fell back to text parsing (potential garbage)
SELECT 
    d.id,
    d.filename,
    d.mime_type,
    d.metadata->>'chunk_count' as chunks,
    d.metadata->>'parse_method' as parser,
    d.processing_status,
    CASE 
        WHEN (d.metadata->>'chunk_count')::int > 50 AND d.mime_type LIKE 'image/%' THEN '🚨 LIKELY GARBAGE'
        WHEN d.metadata->>'parse_method' = 'fallback' THEN '⚠️ FALLBACK USED'
        ELSE '✅ OK'
    END as assessment
FROM documents d
WHERE d.tenant_id = 'b89b8fab-0a25-4266-a4d0-306cc4d358cb' -- Replace with your tenant_id
  AND d.mime_type LIKE 'image/%'
ORDER BY d.created_at DESC;

-- 7️⃣ PROCESSING SPEED ANALYSIS
-- Shows how long each file type takes to process
SELECT 
    d.mime_type,
    COUNT(*) as total_files,
    AVG(EXTRACT(EPOCH FROM (d.updated_at - d.created_at))) as avg_seconds,
    MIN(EXTRACT(EPOCH FROM (d.updated_at - d.created_at))) as min_seconds,
    MAX(EXTRACT(EPOCH FROM (d.updated_at - d.created_at))) as max_seconds,
    AVG((d.metadata->>'chunk_count')::int) as avg_chunks
FROM documents d
WHERE d.tenant_id = 'b89b8fab-0a25-4266-a4d0-306cc4d358cb' -- Replace with your tenant_id
  AND d.processing_status = 'completed'
  AND d.updated_at IS NOT NULL
GROUP BY d.mime_type
ORDER BY avg_seconds DESC;

-- 8️⃣ CLEANUP CANDIDATES
-- Find documents that should be deleted (garbage chunks from old images)
SELECT 
    d.id,
    d.filename,
    d.mime_type,
    d.metadata->>'chunk_count' as chunks,
    d.metadata->>'parse_method' as parser,
    d.created_at,
    'DELETE FROM documents WHERE id = ''' || d.id || ''';' as delete_sql
FROM documents d
WHERE d.tenant_id = 'b89b8fab-0a25-4266-a4d0-306cc4d358cb' -- Replace with your tenant_id
  AND d.mime_type LIKE 'image/%'
  AND d.metadata->>'parse_method' = 'fallback'
  AND (d.metadata->>'chunk_count')::int > 50
ORDER BY d.created_at DESC;

-- ============================================
-- HOW TO USE:
-- 1. Copy the query you want to run
-- 2. Replace tenant_id with your actual tenant ID
-- 3. Run in Supabase SQL Editor
-- 4. Share results with the AI for analysis
-- ============================================
