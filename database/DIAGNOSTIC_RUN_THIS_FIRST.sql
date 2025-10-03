-- DIAGNOSTIC: Run this first to understand current state
-- This is 100% SAFE - only SELECT queries, no modifications

-- ========================================
-- STEP 1: Check documents table columns
-- ========================================
SELECT 
  '=== DOCUMENTS TABLE COLUMNS ===' as info;

SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'documents'
ORDER BY ordinal_position;

-- ========================================
-- STEP 2: Check document_chunks table columns
-- ========================================
SELECT 
  '=== DOCUMENT_CHUNKS TABLE COLUMNS ===' as info;

SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'document_chunks'
ORDER BY ordinal_position;

-- ========================================
-- STEP 3: Check current similarity_search function
-- ========================================
SELECT 
  '=== CURRENT SIMILARITY_SEARCH FUNCTION ===' as info;

SELECT 
  p.proname as function_name,
  pg_get_function_result(p.oid) as return_type,
  pg_get_function_arguments(p.oid) as arguments
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname = 'similarity_search';

-- Get the actual function definition
SELECT 
  '=== FUNCTION DEFINITION ===' as info;

SELECT pg_get_functiondef(p.oid) as function_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname = 'similarity_search';

-- ========================================
-- STEP 4: Sample actual data to see what's available
-- ========================================
SELECT 
  '=== SAMPLE DATA CHECK ===' as info;

SELECT 
  d.id as document_id,
  d.filename,
  d.tenant_id,
  d.processing_status,
  d.document_category,
  d.metadata as doc_metadata,
  d.metadata->>'page' as page_from_doc_metadata,
  dc.id as chunk_id,
  dc.chunk_index,
  dc.metadata as chunk_metadata,
  dc.metadata->>'page' as page_from_chunk_metadata,
  dc.tenant_id as chunk_tenant_id,
  dc.access_level as chunk_access_level
FROM documents d
JOIN document_chunks dc ON dc.document_id = d.id
LIMIT 5;

-- ========================================
-- STEP 5: Test if access_level exists on tenants
-- ========================================
SELECT 
  '=== CHECKING FOR TENANTS.ACCESS_LEVEL ===' as info;

SELECT 
  EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'tenants' 
      AND column_name = 'access_level'
  ) as tenants_has_access_level;

-- ========================================
-- STEP 6: Check where access_level exists
-- ========================================
SELECT 
  '=== TABLES WITH ACCESS_LEVEL COLUMN ===' as info;

SELECT 
  table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE column_name = 'access_level'
  AND table_schema = 'public'
ORDER BY table_name;

-- ========================================
-- STEP 7: Test current function (if embeddings exist)
-- ========================================
SELECT 
  '=== TESTING CURRENT FUNCTION ===' as info;

DO $$
DECLARE
  sample_embedding vector(768);
  result_record RECORD;
BEGIN
  -- Get a sample embedding
  SELECT embedding INTO sample_embedding 
  FROM document_chunks 
  LIMIT 1;
  
  IF sample_embedding IS NOT NULL THEN
    RAISE NOTICE '✅ Found sample embedding, testing similarity_search...';
    
    -- Try to run the function
    BEGIN
      FOR result_record IN 
        SELECT * FROM similarity_search(sample_embedding, 0.1, 3, NULL, 1)
      LOOP
        RAISE NOTICE 'Result: doc_id=%, content_preview=%', 
          result_record.document_id, 
          substring(result_record.content, 1, 50);
      END LOOP;
      
      RAISE NOTICE '✅ Function executed successfully';
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE '❌ Function failed with error: %', SQLERRM;
      RAISE NOTICE '   This indicates the function has bugs';
    END;
  ELSE
    RAISE NOTICE '⚠️ No embeddings found - cannot test function';
    RAISE NOTICE '   Upload a document first to enable testing';
  END IF;
END $$;

-- ========================================
-- SUMMARY REPORT
-- ========================================
SELECT 
  '=== DIAGNOSTIC SUMMARY ===' as info;

SELECT 
  'Documents in system' as metric,
  COUNT(*)::text as value
FROM documents
UNION ALL
SELECT 
  'Chunks in system',
  COUNT(*)::text
FROM document_chunks
UNION ALL
SELECT 
  'Documents with embeddings',
  COUNT(DISTINCT document_id)::text
FROM document_chunks
WHERE embedding IS NOT NULL
UNION ALL
SELECT 
  'Tenants in system',
  COUNT(*)::text
FROM tenants;

