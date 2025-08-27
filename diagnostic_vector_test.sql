-- ============================================================================
-- DIAGNOSTIC SQL - Vector Database State Check
-- ============================================================================
-- Run this to determine what fix is actually needed

-- 1. Check if pgvector extension exists
SELECT 
  'pgvector_extension' as check_type,
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'vector') 
    THEN '✅ INSTALLED' 
    ELSE '❌ MISSING' 
  END as status;

-- 2. Check if document_chunks table exists
SELECT 
  'document_chunks_table' as check_type,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'document_chunks'
    ) 
    THEN '✅ EXISTS' 
    ELSE '❌ MISSING' 
  END as status;

-- 3. If table exists, check embedding column type
SELECT 
  'embedding_column_type' as check_type,
  COALESCE(
    (SELECT 
      CASE 
        WHEN udt_name = 'vector' THEN '✅ VECTOR TYPE'
        WHEN udt_name = 'USER-DEFINED' THEN '❌ USER-DEFINED (needs fix)'
        ELSE '⚠️ UNKNOWN: ' || udt_name
      END
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'document_chunks' 
    AND column_name = 'embedding'),
    '❌ TABLE OR COLUMN MISSING'
  ) as status;

-- 4. Check if similarity_search function exists
SELECT 
  'similarity_search_function' as check_type,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
      WHERE n.nspname = 'public' 
      AND p.proname = 'similarity_search'
    ) 
    THEN '✅ EXISTS' 
    ELSE '❌ MISSING' 
  END as status;

-- 5. If function exists, check its volatility
SELECT 
  'function_volatility' as check_type,
  COALESCE(
    (SELECT 
      CASE provolatile
        WHEN 'v' THEN '✅ VOLATILE (correct)'
        WHEN 's' THEN '❌ STABLE (needs fix)'
        WHEN 'i' THEN '⚠️ IMMUTABLE'
        ELSE '⚠️ UNKNOWN'
      END
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' 
    AND p.proname = 'similarity_search'
    LIMIT 1),
    '❌ FUNCTION MISSING'
  ) as status;

-- 6. Check if vector indexes exist
SELECT 
  'vector_indexes' as check_type,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_indexes 
      WHERE schemaname = 'public' 
      AND tablename = 'document_chunks'
      AND indexdef LIKE '%vector%'
    ) 
    THEN '✅ EXISTS' 
    ELSE '❌ MISSING' 
  END as status;

-- 7. Count existing document chunks (if table exists)
SELECT 
  'chunk_count' as check_type,
  COALESCE(
    (SELECT COUNT(*)::text || ' chunks'
    FROM document_chunks 
    WHERE embedding IS NOT NULL),
    '❌ TABLE MISSING OR NO DATA'
  ) as status;
