-- ============================================================================
-- METRIC 1: Vector Search Performance Test
-- ============================================================================
-- Tests how fast your actual similarity_search function is
-- ============================================================================

DO $$
DECLARE
  start_time TIMESTAMP;
  end_time TIMESTAMP;
  duration_ms INTEGER;
  result_count INTEGER;
BEGIN
  start_time := clock_timestamp();
  
  -- Perform actual similarity search
  SELECT COUNT(*) INTO result_count
  FROM similarity_search(
    (SELECT embedding FROM document_chunks 
     WHERE tenant_id = 'b89b8fab-0a25-4266-a4d0-306cc4d358cb' 
     AND embedding IS NOT NULL 
     LIMIT 1),
    'b89b8fab-0a25-4266-a4d0-306cc4d358cb'::uuid,
    5,
    0.3,
    10
  );
  
  end_time := clock_timestamp();
  duration_ms := EXTRACT(MILLISECONDS FROM (end_time - start_time))::INTEGER;
  
  RAISE NOTICE '════════════════════════════════════════════════════════════';
  RAISE NOTICE '📊 METRIC 1: Vector Search Performance';
  RAISE NOTICE '════════════════════════════════════════════════════════════';
  RAISE NOTICE 'Vector Search Duration: % ms', duration_ms;
  RAISE NOTICE 'Results Found: %', result_count;
  RAISE NOTICE '';
  RAISE NOTICE 'Assessment:';
  IF duration_ms < 200 THEN
    RAISE NOTICE '✅ EXCELLENT - Search is fast (% ms)', duration_ms;
    RAISE NOTICE '   Bottleneck is NOT in vector search';
  ELSIF duration_ms < 500 THEN
    RAISE NOTICE '⚠️ ACCEPTABLE - Search is okay (% ms)', duration_ms;
    RAISE NOTICE '   Minor optimization possible';
  ELSIF duration_ms < 1000 THEN
    RAISE NOTICE '⚠️ SLOW - Search needs optimization (% ms)', duration_ms;
    RAISE NOTICE '   Consider adding indexes';
  ELSE
    RAISE NOTICE '❌ CRITICAL - Search is too slow (% ms)', duration_ms;
    RAISE NOTICE '   MAJOR bottleneck in vector search';
  END IF;
  RAISE NOTICE '════════════════════════════════════════════════════════════';
END $$;

