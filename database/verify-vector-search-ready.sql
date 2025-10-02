-- ============================================================================
-- DIAGNOSTIC: Verify Vector Search Readiness
-- ============================================================================
-- Run this to confirm vector search can work
-- ============================================================================

-- 1. Check if similarity_search function exists
SELECT 
  'Function Exists' as check_name,
  CASE 
    WHEN COUNT(*) > 0 THEN '✅ YES'
    ELSE '❌ NO - Run migration 20250102000001_create_similarity_search_function.sql'
  END as status
FROM pg_proc 
WHERE proname = 'similarity_search';

-- 2. Check if document_chunks table has embedding column
SELECT 
  'Embedding Column Exists' as check_name,
  CASE 
    WHEN COUNT(*) > 0 THEN '✅ YES'
    ELSE '❌ NO - Table structure issue'
  END as status
FROM information_schema.columns
WHERE table_name = 'document_chunks' 
  AND column_name = 'embedding';

-- 3. Check how many chunks have embeddings for sculptai tenant
SELECT 
  'Chunks With Embeddings (sculptai)' as check_name,
  CONCAT(
    COUNT(CASE WHEN embedding IS NOT NULL THEN 1 END), ' out of ', COUNT(*),
    CASE 
      WHEN COUNT(CASE WHEN embedding IS NOT NULL THEN 1 END) = 0 THEN ' ❌ CRITICAL: No embeddings!'
      WHEN COUNT(CASE WHEN embedding IS NOT NULL THEN 1 END) < COUNT(*) THEN ' ⚠️ WARNING: Some missing'
      ELSE ' ✅ ALL HAVE EMBEDDINGS'
    END
  ) as status
FROM document_chunks
WHERE tenant_id = 'b89b8fab-0a25-4266-a4d0-306cc4d358cb';

-- 4. Check if HNSW index exists for fast vector search
SELECT 
  'HNSW Index Exists' as check_name,
  CASE 
    WHEN COUNT(*) > 0 THEN '✅ YES - Fast vector search enabled'
    ELSE '⚠️ NO - Add: CREATE INDEX idx_document_chunks_embedding_hnsw ON document_chunks USING hnsw (embedding vector_cosine_ops);'
  END as status
FROM pg_indexes
WHERE tablename = 'document_chunks' 
  AND indexdef LIKE '%hnsw%';

-- 5. Test actual vector search (if function exists)
DO $$
DECLARE
    test_count int;
BEGIN
    -- Try to run similarity_search with dummy embedding
    SELECT COUNT(*) INTO test_count
    FROM similarity_search(
        array_fill(0.1, ARRAY[768])::vector(768),
        'b89b8fab-0a25-4266-a4d0-306cc4d358cb'::uuid,
        5,
        0.1,  -- Low threshold for testing
        5
    );
    
    RAISE NOTICE '✅ Vector search test: Found % results', test_count;
EXCEPTION 
    WHEN OTHERS THEN
        RAISE NOTICE '❌ Vector search test FAILED: %', SQLERRM;
END $$;

