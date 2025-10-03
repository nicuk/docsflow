-- Diagnose why sources show as "Unknown (page 1)"
-- This checks if document metadata is properly joined in similarity_search

-- Step 1: Check a sample of document_chunks and their documents
SELECT 
  dc.id as chunk_id,
  dc.content::text as chunk_preview,
  dc.chunk_index,
  d.id as document_id,
  d.filename,
  d.tenant_id,
  t.subdomain as tenant_subdomain,
  d.upload_date,
  d.document_date
FROM document_chunks dc
JOIN documents d ON d.id = dc.document_id
JOIN tenants t ON t.id = d.tenant_id
ORDER BY d.created_at DESC
LIMIT 10;

-- Step 2: Test the similarity_search function directly
-- Replace with actual embedding from a query
DO $$
DECLARE
  test_tenant_id TEXT := 'your-tenant-id-here';  -- REPLACE THIS
  sample_embedding vector(768);
BEGIN
  -- Get a sample embedding from an existing chunk
  SELECT embedding INTO sample_embedding 
  FROM document_chunks 
  LIMIT 1;
  
  -- Test similarity_search with tenant filter
  RAISE NOTICE 'Testing similarity_search with tenant_id: %', test_tenant_id;
  
  PERFORM * FROM similarity_search(
    sample_embedding,
    0.3,  -- match_threshold
    5,    -- match_count
    test_tenant_id,
    1     -- access_level
  );
END $$;

-- Step 3: Check if documents are missing filenames
SELECT 
  COUNT(*) as total_documents,
  COUNT(CASE WHEN filename IS NULL THEN 1 END) as null_filenames,
  COUNT(CASE WHEN filename = '' THEN 1 END) as empty_filenames,
  COUNT(CASE WHEN filename LIKE '%Unknown%' THEN 1 END) as unknown_filenames
FROM documents;

-- Step 4: Check cross-tenant contamination
-- If this returns multiple tenants, there's a tenant isolation bug
SELECT 
  t.subdomain,
  COUNT(d.id) as document_count,
  COUNT(dc.id) as chunk_count
FROM tenants t
LEFT JOIN documents d ON d.tenant_id = t.id
LEFT JOIN document_chunks dc ON dc.document_id = d.id
GROUP BY t.id, t.subdomain
ORDER BY chunk_count DESC;

-- Step 5: Verify RLS policies are active
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename IN ('documents', 'document_chunks', 'tenants')
ORDER BY tablename, policyname;

-- Step 6: Check the similarity_search function definition
SELECT 
  routine_name,
  routine_type,
  data_type,
  routine_definition
FROM information_schema.routines
WHERE routine_name = 'similarity_search';

-- Step 7: Look for duplicate or orphaned chunks
SELECT 
  dc.document_id,
  d.filename,
  COUNT(dc.id) as chunk_count,
  ARRAY_AGG(dc.chunk_index ORDER BY dc.chunk_index) as chunk_indices
FROM document_chunks dc
LEFT JOIN documents d ON d.id = dc.document_id
GROUP BY dc.document_id, d.filename
HAVING COUNT(dc.id) > 100 OR d.filename IS NULL
ORDER BY chunk_count DESC
LIMIT 20;

-- Step 8: Sample actual similarity_search results
-- This shows what the function actually returns
WITH sample_query AS (
  SELECT embedding as query_embedding
  FROM document_chunks
  LIMIT 1
)
SELECT 
  ss.id,
  ss.content::text as content_preview,
  ss.similarity,
  ss.document_id,
  ss.chunk_index,
  d.filename,  -- THIS SHOULD BE POPULATED!
  d.tenant_id
FROM sample_query sq,
LATERAL similarity_search(
  sq.query_embedding,
  0.3,  -- threshold
  5,    -- limit
  NULL, -- tenant_id (NULL = all tenants - should be filtered!)
  1     -- access_level
) ss
LEFT JOIN documents d ON d.id = ss.document_id;

