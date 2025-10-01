-- ============================================================================
-- METRIC 1: Vector Search Performance Test (Returns Results)
-- ============================================================================

WITH timing AS (
  SELECT 
    clock_timestamp() as start_time,
    (SELECT COUNT(*) 
     FROM similarity_search(
       (SELECT embedding FROM document_chunks 
        WHERE tenant_id = 'b89b8fab-0a25-4266-a4d0-306cc4d358cb' 
        AND embedding IS NOT NULL 
        LIMIT 1),
       'b89b8fab-0a25-4266-a4d0-306cc4d358cb'::uuid,
       5,
       0.3,
       10
     )) as result_count,
    clock_timestamp() as end_time
)
SELECT 
  '📊 METRIC 1: Vector Search Speed' as metric,
  result_count,
  EXTRACT(MILLISECONDS FROM (end_time - start_time))::INTEGER as duration_ms,
  CASE 
    WHEN EXTRACT(MILLISECONDS FROM (end_time - start_time))::INTEGER < 200 
    THEN '✅ EXCELLENT - Very Fast'
    WHEN EXTRACT(MILLISECONDS FROM (end_time - start_time))::INTEGER < 500 
    THEN '⚠️ ACCEPTABLE - Okay Speed'
    WHEN EXTRACT(MILLISECONDS FROM (end_time - start_time))::INTEGER < 1000 
    THEN '⚠️ SLOW - Needs Optimization'
    ELSE '❌ CRITICAL - Major Bottleneck'
  END as assessment,
  CASE 
    WHEN EXTRACT(MILLISECONDS FROM (end_time - start_time))::INTEGER < 200 
    THEN 'Bottleneck is NOT in vector search'
    ELSE 'Vector search is slow - needs optimization'
  END as conclusion
FROM timing;

