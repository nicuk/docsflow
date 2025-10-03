-- 🔍 SIMPLE HEALTH CHECK - No Ambiguity, No Errors
-- Date: October 3, 2025
-- Run this first to see what's in your database

-- ============================================================================
-- QUERY 1: Check for chunks with NO filename (CRITICAL)
-- ============================================================================
SELECT 
  '🚨 CRITICAL: No Filename' as issue,
  COUNT(*) as affected_chunks
FROM document_chunks dc
WHERE 
  dc.tenant_id = 'b89b8fab-0a25-4266-a4d0-306cc4d358cb'
  AND (dc.metadata->>'filename' IS NULL OR dc.metadata->>'filename' = '');

-- ============================================================================
-- QUERY 2: Check for polluted image chunks (HIGH)
-- ============================================================================
SELECT 
  '🖼️ HIGH: Polluted Images' as issue,
  COUNT(*) as affected_chunks
FROM document_chunks dc
WHERE 
  dc.tenant_id = 'b89b8fab-0a25-4266-a4d0-306cc4d358cb'
  AND dc.content LIKE 'Here''s a detailed analysis of the image%';

-- ============================================================================
-- QUERY 3: Overall health summary
-- ============================================================================
SELECT 
  COUNT(*) as total_chunks,
  COUNT(*) FILTER (WHERE dc.metadata->>'filename' IS NULL) as no_filename_count,
  COUNT(*) FILTER (WHERE dc.content LIKE 'Here''s a detailed%') as polluted_image_count,
  ROUND(
    (COUNT(*) FILTER (WHERE dc.metadata->>'filename' IS NULL OR dc.content LIKE 'Here''s a detailed%'))::numeric 
    / NULLIF(COUNT(*), 0)::numeric * 100, 
    1
  ) as pollution_percentage
FROM document_chunks dc
WHERE dc.tenant_id = 'b89b8fab-0a25-4266-a4d0-306cc4d358cb';

-- ============================================================================
-- INTERPRETATION:
-- ============================================================================
-- - no_filename_count > 0 → Need cleanup (CRITICAL)
-- - polluted_image_count > 0 → Need cleanup (HIGH priority)
-- - pollution_percentage > 10% → Consider bulk cleanup
-- - pollution_percentage < 10% → Targeted cleanup is fine
-- ============================================================================

