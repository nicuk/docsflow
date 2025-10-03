-- Check actual schema of documents table
-- This verifies what columns actually exist before we modify similarity_search

-- Step 1: Get all columns in documents table
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'documents'
ORDER BY ordinal_position;

-- Step 2: Get all columns in document_chunks table
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'document_chunks'
ORDER BY ordinal_position;

-- Step 3: Check current similarity_search function signature
SELECT 
  p.proname as function_name,
  pg_get_function_result(p.oid) as return_type,
  pg_get_function_arguments(p.oid) as arguments
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname = 'similarity_search';

-- Step 4: Sample what similarity_search currently returns
WITH sample_query AS (
  SELECT embedding as query_embedding
  FROM document_chunks
  LIMIT 1
)
SELECT 
  column_name,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN (
    SELECT routine_name 
    FROM information_schema.routines 
    WHERE routine_name = 'similarity_search'
  );

-- Step 5: Check if metadata JSONB contains what we need
SELECT 
  d.id,
  d.filename,
  d.metadata,
  d.metadata->>'page' as page_from_metadata,
  d.metadata->>'total_pages' as total_pages_from_metadata,
  dc.metadata as chunk_metadata,
  dc.metadata->>'page' as chunk_page
FROM documents d
JOIN document_chunks dc ON dc.document_id = d.id
LIMIT 5;

-- Step 6: Check tenants table columns
SELECT 
  column_name,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'tenants'
ORDER BY ordinal_position;

