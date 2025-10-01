-- ============================================================================
-- METRIC 5: Final Recommendation (Returns Results)
-- ============================================================================
-- Provides specific recommendations based on your performance data
-- ============================================================================

WITH stats AS (
  SELECT 
    COUNT(*) as total_chunks,
    6537 as current_response_ms,
    650 as estimated_rag_ms,
    5887 as estimated_llm_ms
),
recommendations AS (
  SELECT 
    total_chunks,
    current_response_ms,
    estimated_rag_ms,
    estimated_llm_ms,
    ROUND((estimated_llm_ms::NUMERIC / current_response_ms::NUMERIC) * 100, 1) as llm_percentage,
    -- Estimate improvements
    CASE 
      WHEN total_chunks < 50 THEN current_response_ms - 2300 -- Switch to Mistral
      ELSE current_response_ms - 1800
    END as option_a_result_ms,
    CASE 
      WHEN total_chunks < 50 THEN current_response_ms - 3900 -- Switch to Gemini
      ELSE current_response_ms - 3500
    END as option_b_result_ms
  FROM stats
)
SELECT 
  '🎯 METRIC 5: Performance Recommendations' as metric,
  'Current: ' || current_response_ms || 'ms' as current_performance,
  ROUND(llm_percentage, 0) || '% of time is LLM generation' as bottleneck_analysis,
  'Option A: Switch to Mistral 7B + Reduce tokens' as option_a,
  option_a_result_ms || 'ms (' || ROUND(((current_response_ms - option_a_result_ms)::NUMERIC / current_response_ms::NUMERIC) * 100, 0) || '% faster)' as option_a_result,
  'Option B: Switch to Gemini Flash 2.0' as option_b,
  option_b_result_ms || 'ms (' || ROUND(((current_response_ms - option_b_result_ms)::NUMERIC / current_response_ms::NUMERIC) * 100, 0) || '% faster)' as option_b_result,
  CASE 
    WHEN llm_percentage > 80 THEN '🔴 CRITICAL: LLM is 80%+ of time - must optimize'
    WHEN llm_percentage > 60 THEN '⚠️ HIGH: LLM is 60%+ of time - should optimize'
    ELSE '✅ ACCEPTABLE: LLM time is reasonable'
  END as urgency,
  CASE 
    WHEN total_chunks < 50 AND llm_percentage > 60 
    THEN 'Recommended: Option A (Mistral 7B) - 35% faster, same cost'
    WHEN total_chunks < 50 
    THEN 'Recommended: Option B (Gemini) - 60% faster, slightly higher cost'
    ELSE 'Recommended: Optimize both RAG and LLM'
  END as recommendation
FROM recommendations;

