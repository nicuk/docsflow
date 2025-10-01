-- ============================================================================
-- METRIC 4: Estimated Timing Breakdown (Returns Results)
-- ============================================================================
-- Based on your 6537ms total response time, estimates where time is spent
-- ============================================================================

WITH stats AS (
  SELECT COUNT(*) as chunk_count
  FROM document_chunks
  WHERE tenant_id = 'b89b8fab-0a25-4266-a4d0-306cc4d358cb'
),
estimates AS (
  SELECT 
    chunk_count,
    CASE 
      WHEN chunk_count > 500 THEN 500
      WHEN chunk_count > 100 THEN 300
      ELSE 200
    END as vector_search_ms,
    CASE 
      WHEN chunk_count > 500 THEN 300
      WHEN chunk_count > 100 THEN 200
      ELSE 150
    END as keyword_search_ms,
    CASE 
      WHEN chunk_count > 500 THEN 500
      WHEN chunk_count > 100 THEN 400
      ELSE 300
    END as reranking_ms,
    6537 as total_response_ms
  FROM stats
)
SELECT 
  '⏱️ METRIC 4: Timing Breakdown Estimate' as metric,
  total_response_ms as total_ms,
  vector_search_ms,
  keyword_search_ms,
  reranking_ms,
  (vector_search_ms + keyword_search_ms + reranking_ms) as total_rag_ms,
  ROUND(((vector_search_ms + keyword_search_ms + reranking_ms)::NUMERIC / total_response_ms::NUMERIC) * 100, 1) as rag_percentage,
  (total_response_ms - (vector_search_ms + keyword_search_ms + reranking_ms)) as llm_generation_ms,
  ROUND(((total_response_ms - (vector_search_ms + keyword_search_ms + reranking_ms))::NUMERIC / total_response_ms::NUMERIC) * 100, 1) as llm_percentage,
  CASE 
    WHEN ((total_response_ms - (vector_search_ms + keyword_search_ms + reranking_ms))::NUMERIC / total_response_ms::NUMERIC) > 0.6
    THEN '🔴 PRIMARY BOTTLENECK: LLM Generation'
    WHEN (vector_search_ms + keyword_search_ms + reranking_ms) > 1000
    THEN '🔴 PRIMARY BOTTLENECK: RAG Pipeline'
    ELSE '⚠️ MIXED BOTTLENECK'
  END as bottleneck
FROM estimates;

