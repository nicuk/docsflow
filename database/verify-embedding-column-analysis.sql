-- ============================================================================
-- EMBEDDING COLUMN DIAGNOSTIC ANALYSIS
-- Run these queries in Supabase SQL Editor to verify the issue before fixing
-- ============================================================================

-- Query 1: Check vector extension status
SELECT 
  name as extension_name,
  default_version,
  installed_version,
  comment
FROM pg_available_extensions 
WHERE name = 'vector';

-- Query 2: Check if vector extension is enabled
SELECT extname, extversion 
FROM pg_extension 
WHERE extname = 'vector';

-- Query 3: Current document_chunks table structure
SELECT 
  column_name,
  data_type,
  udt_name,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'document_chunks'
ORDER BY ordinal_position;

-- Query 4: Specific embedding column analysis
SELECT 
  column_name,
  data_type,
  udt_name,
  character_maximum_length,
  numeric_precision,
  CASE 
    WHEN data_type = 'USER-DEFINED' AND udt_name = 'vector' THEN 'CORRECT: vector type'
    WHEN data_type = 'USER-DEFINED' AND udt_name != 'vector' THEN 'ISSUE: Unknown user-defined type'
    ELSE 'ISSUE: Not vector type'
  END as status
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'document_chunks' 
AND column_name = 'embedding';

-- Query 5: Check if there's any data in document_chunks
SELECT 
  COUNT(*) as total_rows,
  COUNT(embedding) as rows_with_embeddings,
  COUNT(*) - COUNT(embedding) as null_embeddings
FROM public.document_chunks;

-- Query 6: Sample embedding data (if any exists)
SELECT 
  id,
  chunk_index,
  CASE 
    WHEN embedding IS NULL THEN 'NULL'
    ELSE 'HAS_VALUE'
  END as embedding_status,
  LENGTH(content) as content_length
FROM public.document_chunks 
LIMIT 5;

-- Query 7: Check for vector type functions availability
SELECT 
  routine_name,
  routine_type,
  routine_definition
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name LIKE '%vector%'
LIMIT 10;

-- Query 8: Check existing indexes on embedding column
SELECT 
  indexname,
  indexdef
FROM pg_indexes 
WHERE tablename = 'document_chunks' 
AND indexdef LIKE '%embedding%';

-- Query 9: Verify the fix will work (simulation)
DO $$
BEGIN
  -- Check if the ALTER will succeed
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'document_chunks' 
    AND column_name = 'embedding' 
    AND data_type = 'USER-DEFINED'
    AND udt_name != 'vector'
  ) THEN
    RAISE NOTICE 'FIX NEEDED: embedding column is USER-DEFINED but not vector type';
  ELSIF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'document_chunks' 
    AND column_name = 'embedding' 
    AND data_type != 'USER-DEFINED'
  ) THEN
    RAISE NOTICE 'FIX NEEDED: embedding column is not USER-DEFINED type';
  ELSE
    RAISE NOTICE 'ALREADY CORRECT: embedding column is already vector type';
  END IF;
END;
$$;

-- Query 10: Final verification - what the fix should achieve
SELECT 
  'Expected after fix:' as description,
  'vector' as expected_udt_name,
  'USER-DEFINED' as expected_data_type,
  768 as expected_dimensions;

