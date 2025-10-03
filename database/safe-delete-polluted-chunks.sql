-- 🧹 SAFE DELETE: Old Polluted Chunks
-- Date: October 3, 2025
-- ⚠️ IMPORTANT: Run CHECK queries first, review results, then uncomment DELETE statements

-- ==============================================================================
-- STEP 1: DRY RUN - Preview what will be deleted
-- ==============================================================================

-- Preview: Documents that will be affected
SELECT 
  d.id as document_id,
  d.filename,
  d.mime_type,
  d.created_at,
  d.processing_status,
  COUNT(dc.id) as chunk_count,
  ARRAY_AGG(DISTINCT 
    CASE 
      WHEN dc.metadata->>'filename' IS NULL THEN 'NO_FILENAME'
      WHEN dc.content LIKE 'Here''s a detailed%' THEN 'IMAGE_POLLUTION'
      ELSE 'OLD'
    END
  ) as issues
FROM documents d
LEFT JOIN document_chunks dc ON d.id = dc.document_id
WHERE 
  d.tenant_id = 'b89b8fab-0a25-4266-a4d0-306cc4d358cb'
  AND (
    -- Documents with polluted chunks
    dc.metadata->>'filename' IS NULL
    OR dc.content LIKE 'Here''s a detailed%'
    -- OR documents created before the fix
    OR d.created_at < '2025-10-03 10:30:00'::timestamp
  )
GROUP BY d.id, d.filename, d.mime_type, d.created_at, d.processing_status
ORDER BY d.created_at DESC;

-- ==============================================================================
-- STEP 2: OPTION A - Delete ONLY critically broken chunks (safest)
-- ==============================================================================

-- 🎯 RECOMMENDED: Delete only chunks with NO filename
-- These are 100% broken and can't be retrieved correctly

-- -- UNCOMMENT AFTER REVIEW:
-- DELETE FROM document_chunks
-- WHERE 
--   tenant_id = 'b89b8fab-0a25-4266-a4d0-306cc4d358cb'
--   AND (metadata->>'filename' IS NULL OR metadata->>'filename' = '');

-- -- Verify deletion:
-- SELECT COUNT(*) as deleted_critical_chunks
-- FROM document_chunks
-- WHERE 
--   tenant_id = 'b89b8fab-0a25-4266-a4d0-306cc4d358cb'
--   AND metadata->>'filename' IS NULL;

-- ==============================================================================
-- STEP 3: OPTION B - Delete polluted image chunks (recommended)
-- ==============================================================================

-- 🎯 RECOMMENDED: Delete image chunks with LLM descriptions
-- These have "Here's a detailed analysis..." instead of actual image content

-- -- UNCOMMENT AFTER REVIEW:
-- DELETE FROM document_chunks
-- WHERE 
--   tenant_id = 'b89b8fab-0a25-4266-a4d0-306cc4d358cb'
--   AND (
--     content LIKE 'Here''s a detailed analysis of the image%'
--     OR content LIKE 'Here is a detailed analysis%'
--   );

-- -- Verify deletion:
-- SELECT COUNT(*) as remaining_polluted_images
-- FROM document_chunks
-- WHERE 
--   tenant_id = 'b89b8fab-0a25-4266-a4d0-306cc4d358cb'
--   AND content LIKE 'Here''s a detailed%';

-- ==============================================================================
-- STEP 4: OPTION C - Delete ALL old chunks (nuclear option)
-- ==============================================================================

-- ⚠️ NUCLEAR: Delete all chunks created before the fix
-- Only use if you're okay with users re-uploading documents

-- -- UNCOMMENT AFTER REVIEW:
-- DELETE FROM document_chunks
-- WHERE 
--   tenant_id = 'b89b8fab-0a25-4266-a4d0-306cc4d358cb'
--   AND created_at < '2025-10-03 10:30:00'::timestamp;

-- -- Verify deletion:
-- SELECT 
--   COUNT(*) as remaining_chunks,
--   MIN(created_at) as oldest_chunk
-- FROM document_chunks
-- WHERE tenant_id = 'b89b8fab-0a25-4266-a4d0-306cc4d358cb';

-- ==============================================================================
-- STEP 5: ORPHANED DOCUMENTS - Delete documents with no chunks
-- ==============================================================================

-- After deleting chunks, some documents may have no chunks left
-- Delete these orphaned documents

-- -- Preview orphaned documents:
-- SELECT 
--   d.id,
--   d.filename,
--   d.created_at,
--   d.processing_status,
--   COUNT(dc.id) as chunk_count
-- FROM documents d
-- LEFT JOIN document_chunks dc ON d.id = dc.document_id
-- WHERE d.tenant_id = 'b89b8fab-0a25-4266-a4d0-306cc4d358cb'
-- GROUP BY d.id, d.filename, d.created_at, d.processing_status
-- HAVING COUNT(dc.id) = 0;

-- -- UNCOMMENT AFTER REVIEW:
-- DELETE FROM documents
-- WHERE 
--   id IN (
--     SELECT d.id
--     FROM documents d
--     LEFT JOIN document_chunks dc ON d.id = dc.document_id
--     WHERE d.tenant_id = 'b89b8fab-0a25-4266-a4d0-306cc4d358cb'
--     GROUP BY d.id
--     HAVING COUNT(dc.id) = 0
--   );

-- ==============================================================================
-- RECOMMENDED EXECUTION ORDER:
-- ==============================================================================
-- 1. Run STEP 1 (Dry Run) - Review what will be deleted
-- 2. Run STEP 2 (Option A) - Delete chunks with no filename
-- 3. Run STEP 3 (Option B) - Delete polluted image chunks
-- 4. Run STEP 5 - Delete orphaned documents
-- 5. Ask users to re-upload documents if needed
-- ==============================================================================

