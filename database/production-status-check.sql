-- ============================================================================
-- PRODUCTION STATUS CHECK: Is the vector search actually fixed?
-- ============================================================================

-- 1. Does similarity_search function exist?
SELECT 
  'similarity_search function' as check,
  CASE 
    WHEN COUNT(*) > 0 THEN '✅ EXISTS'
    ELSE '❌ MISSING - Need to run migration 20250102000001'
  END as status
FROM pg_proc 
WHERE proname = 'similarity_search';

-- 2. What is the embedding column type?
SELECT 
  'embedding column type' as check,
  CASE 
    WHEN udt_name = 'vector' THEN '✅ CORRECT (vector)'
    ELSE '❌ WRONG: ' || udt_name || ' - Need to run fix-embedding-data-format.sql'
  END as status
FROM information_schema.columns
WHERE table_name = 'document_chunks' 
  AND column_name = 'embedding';

-- 3. Sample embedding check
SELECT 
  'sample embedding' as check,
  CASE 
    WHEN embedding IS NOT NULL THEN '✅ HAS DATA'
    ELSE '❌ NULL'
  END as status,
  pg_typeof(embedding)::text as actual_type
FROM document_chunks
WHERE tenant_id = 'b89b8fab-0a25-4266-a4d0-306cc4d358cb'
  AND embedding IS NOT NULL
LIMIT 1;

-- 4. Test similarity_search function directly
SELECT 
  'function test' as check,
  CASE 
    WHEN COUNT(*) > 0 THEN '✅ WORKS - Found ' || COUNT(*) || ' results'
    ELSE '❌ BROKEN - Returns 0'
  END as status
FROM similarity_search(
  (SELECT embedding FROM document_chunks WHERE embedding IS NOT NULL LIMIT 1),
  'b89b8fab-0a25-4266-a4d0-306cc4d358cb'::uuid,
  5,
  0.01,
  10
);

-- 5. Check HNSW index
SELECT 
  'HNSW index' as check,
  CASE 
    WHEN COUNT(*) > 0 THEN '✅ EXISTS'
    ELSE '❌ MISSING'
  END as status
FROM pg_indexes 
WHERE tablename = 'document_chunks' 
  AND indexname LIKE '%hnsw%';

