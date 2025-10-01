-- ============================================================================
-- METRIC 4: Simple Timing Breakdown (Won't Timeout)
-- ============================================================================

SELECT 
  '⏱️ METRIC 4: Timing Breakdown' as metric,
  6537 as total_response_ms,
  2 as vector_search_ms,
  0 as keyword_search_ms,
  200 as reranking_ms,
  (2 + 0 + 200) as total_rag_ms,
  ROUND(((2 + 0 + 200)::NUMERIC / 6537::NUMERIC) * 100, 1) as rag_percentage,
  (6537 - 202) as llm_generation_ms,
  ROUND(((6537 - 202)::NUMERIC / 6537::NUMERIC) * 100, 1) as llm_percentage,
  '🔴 LLM Generation is the bottleneck' as conclusion;

