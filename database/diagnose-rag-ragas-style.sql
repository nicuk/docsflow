-- ============================================================================
-- RAGAS-Style RAG Diagnostics for DocsFlow
-- ============================================================================
-- This diagnostic uses RAGAS framework principles to evaluate:
-- 1. Context Relevancy - Are retrieved documents relevant?
-- 2. Context Recall - Are we finding all relevant documents?
-- 3. Retrieval Quality - How similar are the embeddings?
--
-- Run this in Supabase SQL Editor to diagnose your RAG system
-- ============================================================================

-- ============================================================================
-- METRIC 1: Context Recall - Do we have documents with embeddings?
-- ============================================================================
SELECT 
  '📊 METRIC 1: Context Recall (Document Availability)' as metric,
  COUNT(*) as total_chunks,
  COUNT(CASE WHEN embedding IS NOT NULL THEN 1 END) as chunks_with_embeddings,
  ROUND(100.0 * COUNT(CASE WHEN embedding IS NOT NULL THEN 1 END) / NULLIF(COUNT(*), 0), 2) as embedding_coverage_percent
FROM document_chunks
WHERE tenant_id = 'b89b8fab-0a25-4266-a4d0-306cc4d358cb';

-- ============================================================================
-- METRIC 2: Context Relevancy - Distribution of similarity scores
-- ============================================================================
WITH sample_embedding AS (
  SELECT embedding 
  FROM document_chunks 
  WHERE tenant_id = 'b89b8fab-0a25-4266-a4d0-306cc4d358cb'
  AND embedding IS NOT NULL 
  LIMIT 1
),
similarity_distribution AS (
  SELECT 
    id,
    content,
    1 - (embedding <=> (SELECT embedding FROM sample_embedding)) as similarity
  FROM document_chunks
  WHERE tenant_id = 'b89b8fab-0a25-4266-a4d0-306cc4d358cb'
  AND embedding IS NOT NULL
)
SELECT 
  '🎯 METRIC 2: Context Relevancy (Similarity Distribution)' as metric,
  COUNT(*) as total_comparisons,
  ROUND(AVG(similarity)::numeric, 4) as avg_similarity,
  ROUND(MIN(similarity)::numeric, 4) as min_similarity,
  ROUND(MAX(similarity)::numeric, 4) as max_similarity,
  COUNT(CASE WHEN similarity >= 0.7 THEN 1 END) as matches_at_0_7,
  COUNT(CASE WHEN similarity >= 0.5 THEN 1 END) as matches_at_0_5,
  COUNT(CASE WHEN similarity >= 0.3 THEN 1 END) as matches_at_0_3
FROM similarity_distribution;

-- ============================================================================
-- METRIC 3: Retrieval Quality - Test actual similarity_search function
-- ============================================================================
WITH test_query AS (
  SELECT embedding as query_embedding
  FROM document_chunks 
  WHERE tenant_id = 'b89b8fab-0a25-4266-a4d0-306cc4d358cb'
  AND embedding IS NOT NULL 
  LIMIT 1
)
SELECT 
  '🔍 METRIC 3: Retrieval Quality (Function Test)' as metric,
  'Threshold 0.7' as threshold_level,
  COUNT(*) as results_found,
  CASE 
    WHEN COUNT(*) = 0 THEN '❌ TOO STRICT - No results'
    WHEN COUNT(*) < 3 THEN '⚠️ BORDERLINE - Few results'
    ELSE '✅ GOOD - Adequate results'
  END as assessment
FROM similarity_search(
  (SELECT query_embedding FROM test_query),
  'b89b8fab-0a25-4266-a4d0-306cc4d358cb'::uuid,
  5,
  0.7,
  10
)
UNION ALL
SELECT 
  '🔍 METRIC 3: Retrieval Quality (Function Test)' as metric,
  'Threshold 0.5' as threshold_level,
  COUNT(*) as results_found,
  CASE 
    WHEN COUNT(*) = 0 THEN '❌ PROBLEM - Still no results'
    WHEN COUNT(*) < 3 THEN '⚠️ BORDERLINE - Few results'
    ELSE '✅ GOOD - Adequate results'
  END as assessment
FROM similarity_search(
  (SELECT query_embedding FROM test_query),
  'b89b8fab-0a25-4266-a4d0-306cc4d358cb'::uuid,
  5,
  0.5,
  10
)
UNION ALL
SELECT 
  '🔍 METRIC 3: Retrieval Quality (Function Test)' as metric,
  'Threshold 0.3' as threshold_level,
  COUNT(*) as results_found,
  CASE 
    WHEN COUNT(*) = 0 THEN '❌ CRITICAL - Function broken'
    WHEN COUNT(*) < 3 THEN '⚠️ CHECK - Few results even at low threshold'
    ELSE '✅ GOOD - Function working'
  END as assessment
FROM similarity_search(
  (SELECT query_embedding FROM test_query),
  'b89b8fab-0a25-4266-a4d0-306cc4d358cb'::uuid,
  5,
  0.3,
  10
);

-- ============================================================================
-- METRIC 4: Answer Faithfulness - Check document content quality
-- ============================================================================
SELECT 
  '📝 METRIC 4: Answer Faithfulness (Content Quality)' as metric,
  COUNT(*) as total_chunks,
  ROUND(AVG(LENGTH(content))::numeric, 0) as avg_content_length,
  MIN(LENGTH(content)) as min_content_length,
  MAX(LENGTH(content)) as max_content_length,
  COUNT(CASE WHEN LENGTH(content) < 50 THEN 1 END) as chunks_too_short,
  COUNT(CASE WHEN LENGTH(content) > 1000 THEN 1 END) as chunks_very_long
FROM document_chunks
WHERE tenant_id = 'b89b8fab-0a25-4266-a4d0-306cc4d358cb';

-- ============================================================================
-- METRIC 5: Context Utilization - Sample actual content
-- ============================================================================
SELECT 
  '💡 METRIC 5: Context Utilization (Sample Content)' as metric,
  id,
  LEFT(content, 150) || '...' as content_preview,
  LENGTH(content) as content_length,
  CASE 
    WHEN embedding IS NOT NULL THEN '✅ Has embedding'
    ELSE '❌ No embedding'
  END as embedding_status
FROM document_chunks
WHERE tenant_id = 'b89b8fab-0a25-4266-a4d0-306cc4d358cb'
LIMIT 5;

-- ============================================================================
-- DIAGNOSTIC SUMMARY
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE 'RAGAS-Style RAG Diagnostic Complete';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE 'Interpretation Guide:';
  RAISE NOTICE '1. Context Recall: Should be 100%% (all chunks have embeddings)';
  RAISE NOTICE '2. Context Relevancy: Avg similarity should be 0.4-0.8';
  RAISE NOTICE '3. Retrieval Quality: Should find results at threshold 0.5';
  RAISE NOTICE '4. Answer Faithfulness: Chunks should be 100-500 chars';
  RAISE NOTICE '5. Context Utilization: Content should be meaningful text';
  RAISE NOTICE '';
  RAISE NOTICE 'Next Steps:';
  RAISE NOTICE '- If no embeddings: Re-process documents';
  RAISE NOTICE '- If similarity too low: Lower threshold to 0.5';
  RAISE NOTICE '- If no results at 0.3: Vector search function issue';
  RAISE NOTICE '- If content too short: Re-chunk documents';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
END $$;

