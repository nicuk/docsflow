-- 🚀 EXECUTE THIS NOW: Quick Cleanup for Sculptai Tenant
-- Date: October 3, 2025
-- Recommended: OPTION B (Moderate) - Balances quality with convenience

-- ============================================================================
-- STEP 1: Preview what will be deleted
-- ============================================================================

SELECT 
  '📊 CLEANUP PREVIEW' as action,
  COUNT(*) as total_chunks_to_delete,
  COUNT(DISTINCT dc.document_id) as documents_affected,
  ARRAY_AGG(DISTINCT 
    CASE 
      WHEN dc.metadata->>'filename' IS NULL THEN '🚨 NO_FILENAME'
      WHEN dc.content LIKE 'Here''s a detailed%' THEN '🖼️ IMAGE_POLLUTION'
      ELSE '❓ OTHER'
    END
  ) as issue_types
FROM document_chunks dc
WHERE 
  dc.tenant_id = 'b89b8fab-0a25-4266-a4d0-306cc4d358cb'
  AND (
    -- Critical: No filename
    (dc.metadata->>'filename' IS NULL OR dc.metadata->>'filename' = '')
    -- High: Polluted images
    OR dc.content LIKE 'Here''s a detailed analysis of the image%'
  );

-- ============================================================================
-- STEP 2: Execute cleanup (UNCOMMENT to run)
-- ============================================================================

-- DELETE FROM document_chunks
-- WHERE 
--   tenant_id = 'b89b8fab-0a25-4266-a4d0-306cc4d358cb'
--   AND (
--     (metadata->>'filename' IS NULL OR metadata->>'filename' = '')
--     OR content LIKE 'Here''s a detailed analysis of the image%'
--   );

-- ============================================================================
-- STEP 3: Verify cleanup
-- ============================================================================

-- SELECT 
--   '✅ CLEANUP COMPLETE' as status,
--   COUNT(*) as remaining_chunks,
--   COUNT(*) FILTER (WHERE dc.metadata->>'filename' IS NULL) as still_no_filename,
--   COUNT(*) FILTER (WHERE dc.content LIKE 'Here''s a detailed%') as still_polluted,
--   MIN(dc.created_at) as oldest_chunk_date
-- FROM document_chunks dc
-- WHERE dc.tenant_id = 'b89b8fab-0a25-4266-a4d0-306cc4d358cb';

-- ============================================================================
-- STEP 4: Delete orphaned documents (UNCOMMENT after step 2)
-- ============================================================================

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

-- ============================================================================
-- EXECUTION INSTRUCTIONS:
-- ============================================================================
-- 1. Run STEP 1 first to see what will be deleted
-- 2. If happy with preview, uncomment STEP 2 and run
-- 3. Run STEP 3 to verify cleanup success
-- 4. Run STEP 4 to clean up orphaned documents
-- ============================================================================

