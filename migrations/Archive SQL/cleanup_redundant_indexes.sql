-- Cleanup redundant indexes after HNSW migration
-- This removes duplicate and conflicting indexes for optimal performance

-- Step 1: Remove old IVFFlat vector index (replaced by HNSW)
DROP INDEX IF EXISTS idx_embedding_search;

-- Step 2: Remove duplicate tenant+access indexes (keep the new compound one)
DROP INDEX IF EXISTS idx_document_chunks_tenant_access; -- Duplicate of document_chunks_tenant_access_idx
DROP INDEX IF EXISTS idx_document_chunks_access_level;  -- Covered by compound indexes
DROP INDEX IF EXISTS idx_document_chunks_tenant_id;     -- Covered by compound indexes

-- Step 3: Analyze the complex partial index
-- This index has a WHERE clause that might be useful, let's check if it's needed
-- EXPLAIN (ANALYZE, BUFFERS) 
-- SELECT * FROM document_chunks 
-- WHERE tenant_id = (SELECT id FROM tenants LIMIT 1)
--   AND access_level <= 3 
--   AND document_id = (SELECT id FROM documents LIMIT 1)
--   AND embedding IS NOT NULL;

-- If the above query uses document_chunks_tenant_access_idx instead of idx_document_chunks_search,
-- then we can remove the partial index too:
-- DROP INDEX IF EXISTS idx_document_chunks_search;

-- Step 4: Verify final index state
SELECT 
  indexname,
  indexdef,
  pg_size_pretty(pg_relation_size(indexname::regclass)) as size
FROM pg_indexes
WHERE tablename = 'document_chunks'
ORDER BY indexname;

-- Expected final indexes:
-- 1. document_chunks_pkey (primary key)
-- 2. document_chunks_embedding_hnsw_idx (vector search)
-- 3. document_chunks_tenant_access_idx (tenant filtering)
-- 4. document_chunks_document_idx (document navigation)
-- 5. document_chunks_content_gin_idx (full-text search)
-- 6. idx_document_chunks_search (keep if needed for partial queries)

-- Step 5: Update table statistics after cleanup
ANALYZE document_chunks;
