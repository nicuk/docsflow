-- 🧹 DELETE POLLUTED CHUNKS - SAFE & SIMPLE
-- Date: October 3, 2025
-- Target: 27 chunks with no filename (100% broken)

-- ============================================================================
-- STEP 1: See which documents these chunks belong to
-- ============================================================================
SELECT 
  dc.document_id,
  d.filename as document_filename,
  d.processing_status,
  COUNT(dc.id) as chunk_count,
  MIN(dc.created_at) as oldest_chunk,
  CASE 
    WHEN d.id IS NULL THEN '🚨 ORPHANED (no parent document)'
    WHEN d.processing_status = 'error' THEN '⚠️ ERROR STATUS'
    ELSE '✅ HAS PARENT'
  END as status
FROM document_chunks dc
LEFT JOIN documents d ON dc.document_id = d.id
WHERE 
  dc.tenant_id = 'b89b8fab-0a25-4266-a4d0-306cc4d358cb'
  AND (dc.metadata->>'filename' IS NULL OR dc.metadata->>'filename' = '')
GROUP BY dc.document_id, d.filename, d.processing_status, d.id
ORDER BY chunk_count DESC;

-- ============================================================================
-- STEP 2: DELETE all 27 polluted chunks (SAFE - they're 100% broken)
-- ============================================================================

DELETE FROM document_chunks
WHERE 
  tenant_id = 'b89b8fab-0a25-4266-a4d0-306cc4d358cb'
  AND (metadata->>'filename' IS NULL OR metadata->>'filename' = '');

-- ============================================================================
-- STEP 3: Verify deletion
-- ============================================================================

SELECT 
  '✅ CLEANUP COMPLETE' as status,
  COUNT(*) as remaining_chunks,
  COUNT(*) FILTER (WHERE dc.metadata->>'filename' IS NULL) as still_broken
FROM document_chunks dc
WHERE dc.tenant_id = 'b89b8fab-0a25-4266-a4d0-306cc4d358cb';

-- Expected: remaining_chunks > 0 (your good chunks), still_broken = 0

-- ============================================================================
-- STEP 4: Clean up orphaned documents (documents with no chunks left)
-- ============================================================================

DELETE FROM documents
WHERE 
  tenant_id = 'b89b8fab-0a25-4266-a4d0-306cc4d358cb'
  AND id IN (
    SELECT d.id
    FROM documents d
    LEFT JOIN document_chunks dc ON d.id = dc.document_id
    WHERE d.tenant_id = 'b89b8fab-0a25-4266-a4d0-306cc4d358cb'
    GROUP BY d.id
    HAVING COUNT(dc.id) = 0
  );

-- ============================================================================
-- STEP 5: Final verification
-- ============================================================================

SELECT 
  '🎉 ALL DONE' as status,
  COUNT(DISTINCT d.id) as total_documents,
  COUNT(dc.id) as total_chunks,
  ROUND(AVG(chunks_per_doc.chunk_count), 1) as avg_chunks_per_doc
FROM documents d
LEFT JOIN document_chunks dc ON d.id = dc.document_id
LEFT JOIN (
  SELECT document_id, COUNT(*) as chunk_count
  FROM document_chunks
  WHERE tenant_id = 'b89b8fab-0a25-4266-a4d0-306cc4d358cb'
  GROUP BY document_id
) chunks_per_doc ON d.id = chunks_per_doc.document_id
WHERE d.tenant_id = 'b89b8fab-0a25-4266-a4d0-306cc4d358cb';

-- ============================================================================
-- EXECUTION INSTRUCTIONS:
-- ============================================================================
-- 1. Run STEP 1 to see which documents are affected
-- 2. Run STEP 2 to delete the 27 broken chunks (100% safe)
-- 3. Run STEP 3 to verify still_broken = 0
-- 4. Run STEP 4 to clean up orphaned documents
-- 5. Run STEP 5 to verify everything is clean
-- ============================================================================

