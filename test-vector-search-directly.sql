-- ============================================================================
-- DIRECT VECTOR SEARCH TEST
-- Test if the match_documents function actually works with real data
-- ============================================================================

-- 1. First, let's see what we have to work with
SELECT 'DATA AVAILABLE' as test_name,
       COUNT(*) as total_chunks,
       COUNT(embedding) as chunks_with_embeddings,
       COUNT(DISTINCT document_id) as unique_documents
FROM document_chunks 
WHERE tenant_id = '122928f6-f34e-484b-9a69-7e1f25caf45c';

-- 2. Get a sample embedding to test with
SELECT 'SAMPLE EMBEDDING INFO' as test_name,
       id as chunk_id,
       LENGTH(content) as content_length,
       CASE WHEN embedding IS NOT NULL THEN 'HAS_EMBEDDING' ELSE 'NO_EMBEDDING' END as embedding_status
FROM document_chunks 
WHERE tenant_id = '122928f6-f34e-484b-9a69-7e1f25caf45c'
  AND embedding IS NOT NULL
LIMIT 1;

-- 3. Test the match_documents function directly
-- Create a test embedding (768 dimensions of 0.1)
WITH test_embedding AS (
  SELECT (
    '[' || (
      SELECT array_to_string(array_agg(0.1), ',') 
      FROM generate_series(1, 768)
    ) || ']'
  )::vector as query_vector
)
SELECT 'VECTOR SEARCH TEST' as test_name,
       COUNT(*) as results_found
FROM match_documents(
  (SELECT query_vector FROM test_embedding),
  0.5,  -- Low threshold to find anything
  10,   -- Get up to 10 results
  '122928f6-f34e-484b-9a69-7e1f25caf45c'::uuid  -- bitto tenant
);

-- 4. Test with actual content from a chunk (if available)
-- This uses a real embedding from your data
SELECT 'REAL EMBEDDING TEST' as test_name,
       COUNT(*) as similar_chunks_found
FROM document_chunks dc1
CROSS JOIN (
  SELECT embedding as test_embedding 
  FROM document_chunks 
  WHERE tenant_id = '122928f6-f34e-484b-9a69-7e1f25caf45c' 
    AND embedding IS NOT NULL 
  LIMIT 1
) test
WHERE dc1.tenant_id = '122928f6-f34e-484b-9a69-7e1f25caf45c'
  AND dc1.embedding IS NOT NULL
  AND 1 - (dc1.embedding <=> test.test_embedding) > 0.5;

-- 5. Final diagnosis
SELECT 'DIAGNOSIS' as test_name,
       CASE 
         WHEN (SELECT COUNT(*) FROM document_chunks WHERE tenant_id = '122928f6-f34e-484b-9a69-7e1f25caf45c' AND embedding IS NOT NULL) = 0
         THEN '❌ No embeddings found - documents not processed'
         WHEN (SELECT COUNT(*) FROM pg_proc WHERE proname = 'match_documents') = 0
         THEN '❌ match_documents function missing'
         ELSE '✅ Vector search should work - check RAG pipeline logic'
       END as likely_issue;
