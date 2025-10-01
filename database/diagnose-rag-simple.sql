-- ============================================================================
-- SIMPLE RAG DIAGNOSTIC - Returns all metrics in separate queries
-- ============================================================================
-- Run each section separately in Supabase SQL Editor
-- ============================================================================

-- ============================================================================
-- METRIC 1: Context Recall - Do we have embeddings?
-- ============================================================================
SELECT 
  '📊 METRIC 1: Context Recall' as metric,
  COUNT(*) as total_chunks,
  COUNT(CASE WHEN embedding IS NOT NULL THEN 1 END) as chunks_with_embeddings,
  ROUND(100.0 * COUNT(CASE WHEN embedding IS NOT NULL THEN 1 END) / NULLIF(COUNT(*), 0), 2) as embedding_coverage_percent
FROM document_chunks
WHERE tenant_id = 'b89b8fab-0a25-4266-a4d0-306cc4d358cb';

-- ============================================================================
-- METRIC 2: Similarity Distribution
-- ============================================================================
WITH sample_embedding AS (
  SELECT embedding 
  FROM document_chunks 
  WHERE tenant_id = 'b89b8fab-0a25-4266-a4d0-306cc4d358cb'
  AND embedding IS NOT NULL 
  LIMIT 1
)
SELECT 
  '🎯 METRIC 2: Similarity Distribution' as metric,
  ROUND(AVG(1 - (dc.embedding <=> se.embedding))::numeric, 4) as avg_similarity,
  ROUND(MIN(1 - (dc.embedding <=> se.embedding))::numeric, 4) as min_similarity,
  ROUND(MAX(1 - (dc.embedding <=> se.embedding))::numeric, 4) as max_similarity,
  COUNT(CASE WHEN (1 - (dc.embedding <=> se.embedding)) >= 0.7 THEN 1 END) as matches_at_threshold_0_7,
  COUNT(CASE WHEN (1 - (dc.embedding <=> se.embedding)) >= 0.5 THEN 1 END) as matches_at_threshold_0_5,
  COUNT(CASE WHEN (1 - (dc.embedding <=> se.embedding)) >= 0.3 THEN 1 END) as matches_at_threshold_0_3
FROM document_chunks dc, sample_embedding se
WHERE dc.tenant_id = 'b89b8fab-0a25-4266-a4d0-306cc4d358cb'
AND dc.embedding IS NOT NULL;

-- ============================================================================
-- METRIC 3: Retrieval Quality at 0.7 threshold
-- ============================================================================
WITH test_query AS (
  SELECT embedding as query_embedding
  FROM document_chunks 
  WHERE tenant_id = 'b89b8fab-0a25-4266-a4d0-306cc4d358cb'
  AND embedding IS NOT NULL 
  LIMIT 1
)
SELECT 
  '🔍 METRIC 3: Retrieval at Threshold 0.7' as metric,
  COUNT(*) as results_found,
  CASE 
    WHEN COUNT(*) = 0 THEN '❌ TOO STRICT'
    WHEN COUNT(*) < 3 THEN '⚠️ BORDERLINE'
    ELSE '✅ GOOD'
  END as assessment
FROM similarity_search(
  (SELECT query_embedding FROM test_query),
  'b89b8fab-0a25-4266-a4d0-306cc4d358cb'::uuid,
  5,
  0.7,
  10
);

-- ============================================================================
-- METRIC 3B: Retrieval Quality at 0.5 threshold
-- ============================================================================
WITH test_query AS (
  SELECT embedding as query_embedding
  FROM document_chunks 
  WHERE tenant_id = 'b89b8fab-0a25-4266-a4d0-306cc4d358cb'
  AND embedding IS NOT NULL 
  LIMIT 1
)
SELECT 
  '🔍 METRIC 3B: Retrieval at Threshold 0.5' as metric,
  COUNT(*) as results_found,
  CASE 
    WHEN COUNT(*) = 0 THEN '❌ STILL BROKEN'
    WHEN COUNT(*) < 3 THEN '⚠️ BORDERLINE'
    ELSE '✅ GOOD'
  END as assessment
FROM similarity_search(
  (SELECT query_embedding FROM test_query),
  'b89b8fab-0a25-4266-a4d0-306cc4d358cb'::uuid,
  5,
  0.5,
  10
);

-- ============================================================================
-- METRIC 4: Content Quality
-- ============================================================================
SELECT 
  '📝 METRIC 4: Content Quality' as metric,
  COUNT(*) as total_chunks,
  ROUND(AVG(LENGTH(content))::numeric, 0) as avg_content_length,
  MIN(LENGTH(content)) as min_length,
  MAX(LENGTH(content)) as max_length,
  COUNT(CASE WHEN LENGTH(content) < 100 THEN 1 END) as chunks_too_short,
  COUNT(CASE WHEN LENGTH(content) > 2000 THEN 1 END) as chunks_very_long,
  -- Check for delimiter spam
  ROUND(AVG(LENGTH(content) - LENGTH(REPLACE(content, ';', '')))::numeric, 0) as avg_semicolons_per_chunk,
  COUNT(CASE WHEN (LENGTH(content) - LENGTH(REPLACE(content, ';', ''))) > 50 THEN 1 END) as chunks_with_delimiter_spam
FROM document_chunks
WHERE tenant_id = 'b89b8fab-0a25-4266-a4d0-306cc4d358cb';

