-- ============================================================================
-- DIAGNOSTIC: Why does similarity_search return 0 results?
-- ============================================================================
-- Run this to diagnose why vector search finds nothing
-- ============================================================================

-- 1. Check if function exists and its signature
SELECT 
  p.proname as function_name,
  pg_get_function_arguments(p.oid) as arguments,
  pg_get_function_result(p.oid) as return_type
FROM pg_proc p
WHERE p.proname = 'similarity_search';

-- 2. Check embedding column type
SELECT 
  column_name,
  data_type,
  udt_name
FROM information_schema.columns
WHERE table_name = 'document_chunks' 
  AND column_name = 'embedding';

-- 3. Check sample embeddings exist and their dimensions
SELECT 
  id,
  tenant_id,
  CASE 
    WHEN embedding IS NULL THEN 'NULL'
    ELSE 'EXISTS'
  END as embedding_status,
  -- Try to get vector dimension if pgvector is installed
  CASE 
    WHEN embedding IS NULL THEN 0
    ELSE array_length(embedding::text::float[], 1)
  END as embedding_dimensions
FROM document_chunks
WHERE tenant_id = 'b89b8fab-0a25-4266-a4d0-306cc4d358cb'
LIMIT 5;

-- 4. Test the function directly with a dummy 768-dim vector
-- This will tell us if the function itself works
SELECT 
  'Function test' as test_name,
  COUNT(*) as result_count
FROM similarity_search(
  array_fill(0.5, ARRAY[768])::vector(768),  -- dummy 768-dim vector
  'b89b8fab-0a25-4266-a4d0-306cc4d358cb'::uuid,  -- tenant_filter (sculptai)
  5,  -- access_level_filter
  0.01,  -- very low threshold to match anything
  10  -- match_count
);

-- 5. Check if chunks exist for this tenant
SELECT 
  'Tenant chunks' as check_name,
  COUNT(*) as total_chunks,
  COUNT(embedding) as chunks_with_embeddings,
  COUNT(*) - COUNT(embedding) as chunks_without_embeddings
FROM document_chunks
WHERE tenant_id = 'b89b8fab-0a25-4266-a4d0-306cc4d358cb';

