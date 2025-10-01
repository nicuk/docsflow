-- ============================================================================
-- METRIC 2: Keyword Search Performance Test (Returns Results)
-- ============================================================================

WITH timing AS (
  SELECT 
    clock_timestamp() as start_time,
    (SELECT COUNT(*) 
     FROM document_chunks
     WHERE tenant_id = 'b89b8fab-0a25-4266-a4d0-306cc4d358cb'
     AND content ILIKE '%device%') as result_count,
    clock_timestamp() as end_time
)
SELECT 
  '🔍 METRIC 2: Keyword Search Speed' as metric,
  result_count,
  EXTRACT(MILLISECONDS FROM (end_time - start_time))::INTEGER as duration_ms,
  CASE 
    WHEN EXTRACT(MILLISECONDS FROM (end_time - start_time))::INTEGER < 100 
    THEN '✅ EXCELLENT - Very Fast'
    WHEN EXTRACT(MILLISECONDS FROM (end_time - start_time))::INTEGER < 300 
    THEN '⚠️ ACCEPTABLE - Okay Speed'
    ELSE '❌ SLOW - Needs Indexes'
  END as assessment
FROM timing;

