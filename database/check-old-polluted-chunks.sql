-- 🧹 CHECK FOR OLD POLLUTED CHUNKS
-- Date: October 3, 2025
-- Purpose: Identify chunks that need cleanup

-- 1️⃣ CRITICAL: Chunks with NO filename (completely broken)
SELECT 
  'CRITICAL: No Filename' as issue_type,
  COUNT(*) as chunk_count,
  COUNT(DISTINCT dc.document_id) as document_count,
  MIN(dc.created_at) as oldest_chunk,
  MAX(dc.created_at) as newest_chunk
FROM document_chunks dc
WHERE 
  (dc.metadata->>'filename' IS NULL OR dc.metadata->>'filename' = '')
  AND dc.tenant_id = 'b89b8fab-0a25-4266-a4d0-306cc4d358cb'; -- sculptai

-- 2️⃣ HIGH: Image chunks with LLM descriptions (polluted)
SELECT 
  'HIGH: Polluted Images' as issue_type,
  COUNT(*) as chunk_count,
  COUNT(DISTINCT dc.document_id) as document_count,
  MIN(dc.created_at) as oldest_chunk,
  MAX(dc.created_at) as newest_chunk
FROM document_chunks dc
WHERE 
  dc.tenant_id = 'b89b8fab-0a25-4266-a4d0-306cc4d358cb'
  AND (
    dc.content LIKE 'Here''s a detailed analysis of the image%'
    OR dc.content LIKE 'Here is a detailed analysis%'
    OR dc.content LIKE '**1. Detailed Description:**%'
  );

-- 3️⃣ MEDIUM: Old chunks from DOCX with LLM summaries (may be polluted)
SELECT 
  'MEDIUM: DOCX with Summaries' as issue_type,
  COUNT(*) as chunk_count,
  COUNT(DISTINCT dc.document_id) as document_count,
  MIN(dc.created_at) as oldest_chunk,
  MAX(dc.created_at) as newest_chunk
FROM document_chunks dc
LEFT JOIN documents d ON dc.document_id = d.id
WHERE 
  dc.tenant_id = 'b89b8fab-0a25-4266-a4d0-306cc4d358cb'
  AND d.mime_type LIKE '%wordprocessingml%'
  AND dc.created_at < '2025-10-03 10:30:00'::timestamp; -- Before latest fix

-- 4️⃣ SAMPLE: Show actual polluted content
SELECT 
  dc.id as chunk_id,
  dc.document_id,
  d.filename,
  LEFT(dc.content, 200) as content_preview,
  dc.created_at,
  CASE 
    WHEN dc.metadata->>'filename' IS NULL THEN '🚨 NO FILENAME'
    WHEN dc.content LIKE 'Here''s a detailed%' THEN '🚨 IMAGE POLLUTION'
    WHEN dc.content LIKE '%Word Document document%' THEN '⚠️ POSSIBLE DOCX POLLUTION'
    ELSE '✅ LOOKS OK'
  END as status
FROM document_chunks dc
LEFT JOIN documents d ON dc.document_id = d.id
WHERE 
  dc.tenant_id = 'b89b8fab-0a25-4266-a4d0-306cc4d358cb'
  AND (
    dc.metadata->>'filename' IS NULL 
    OR dc.content LIKE 'Here''s a detailed%'
    OR dc.created_at < '2025-10-03 10:30:00'::timestamp
  )
ORDER BY 
  CASE 
    WHEN dc.metadata->>'filename' IS NULL THEN 1
    WHEN dc.content LIKE 'Here''s a detailed%' THEN 2
    ELSE 3
  END,
  dc.created_at DESC
LIMIT 20;

-- 5️⃣ SUMMARY: Total chunks vs problematic chunks
SELECT 
  COUNT(*) as total_chunks,
  COUNT(*) FILTER (WHERE dc.metadata->>'filename' IS NULL) as no_filename,
  COUNT(*) FILTER (WHERE dc.content LIKE 'Here''s a detailed%') as image_polluted,
  COUNT(*) FILTER (WHERE dc.created_at < '2025-10-03 10:30:00'::timestamp) as old_chunks,
  ROUND(
    (COUNT(*) FILTER (WHERE dc.metadata->>'filename' IS NULL OR dc.content LIKE 'Here''s a detailed%'))::numeric 
    / NULLIF(COUNT(*), 0)::numeric * 100, 
    2
  ) as pollution_percentage
FROM document_chunks dc
WHERE dc.tenant_id = 'b89b8fab-0a25-4266-a4d0-306cc4d358cb';

