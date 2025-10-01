-- ============================================================================
-- METRIC 2: Keyword Search Performance Test
-- ============================================================================
-- Tests how fast your keyword search (ILIKE) is
-- ============================================================================

DO $$
DECLARE
  start_time TIMESTAMP;
  end_time TIMESTAMP;
  duration_ms INTEGER;
  result_count INTEGER;
BEGIN
  start_time := clock_timestamp();
  
  -- Perform keyword search simulation
  SELECT COUNT(*) INTO result_count
  FROM document_chunks
  WHERE tenant_id = 'b89b8fab-0a25-4266-a4d0-306cc4d358cb'
  AND content ILIKE '%device%';
  
  end_time := clock_timestamp();
  duration_ms := EXTRACT(MILLISECONDS FROM (end_time - start_time))::INTEGER;
  
  RAISE NOTICE '════════════════════════════════════════════════════════════';
  RAISE NOTICE '🔍 METRIC 2: Keyword Search Performance';
  RAISE NOTICE '════════════════════════════════════════════════════════════';
  RAISE NOTICE 'Keyword Search Duration: % ms', duration_ms;
  RAISE NOTICE 'Results Found: %', result_count;
  RAISE NOTICE '';
  RAISE NOTICE 'Assessment:';
  IF duration_ms < 100 THEN
    RAISE NOTICE '✅ EXCELLENT - Keyword search is fast (% ms)', duration_ms;
  ELSIF duration_ms < 300 THEN
    RAISE NOTICE '⚠️ ACCEPTABLE - Keyword search is okay (% ms)', duration_ms;
  ELSE
    RAISE NOTICE '❌ SLOW - Keyword search needs indexes (% ms)', duration_ms;
  END IF;
  RAISE NOTICE '════════════════════════════════════════════════════════════';
END $$;

