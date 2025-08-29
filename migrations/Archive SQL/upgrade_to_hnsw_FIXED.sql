-- FIXED Migration: Upgrade vector index from IVFFlat to HNSW
-- CRITICAL FIXES: Schema alignment, proper tenant filtering, type corrections
-- Run this in your Supabase SQL Editor

-- Step 1: Fix embedding column type if needed
ALTER TABLE document_chunks 
ALTER COLUMN embedding TYPE vector(768);

-- Step 2: Drop existing problematic indexes and functions
DROP INDEX IF EXISTS document_chunks_embedding_idx;
DROP INDEX IF EXISTS document_chunks_embedding_ivfflat_idx;
DROP INDEX IF EXISTS document_chunks_tenant_idx;
DROP FUNCTION IF EXISTS similarity_search(vector, float, int, text, int);

-- Step 3: Create HNSW index for 3-5x performance improvement
CREATE INDEX document_chunks_embedding_hnsw_idx 
ON document_chunks 
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- Step 4: Create optimized compound indexes
CREATE INDEX document_chunks_tenant_access_idx 
ON document_chunks(tenant_id, access_level);

CREATE INDEX document_chunks_document_idx 
ON document_chunks(document_id, chunk_index);

-- Step 5: Create FIXED similarity_search function with proper types
CREATE OR REPLACE FUNCTION similarity_search(
  query_embedding vector(768),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 10,
  tenant_filter uuid DEFAULT NULL,  -- FIXED: UUID not text
  access_level_filter int DEFAULT 5
)
RETURNS TABLE (
  id uuid,
  content text,
  similarity float,
  document_id uuid,
  chunk_index int,
  metadata jsonb,
  access_level int
)
LANGUAGE plpgsql STABLE
AS $$
BEGIN
  -- Set HNSW search parameters
  SET LOCAL hnsw.ef = 100;
  
  RETURN QUERY
  SELECT
    dc.id,
    dc.content,
    1 - (dc.embedding <=> query_embedding) as similarity,
    dc.document_id,
    dc.chunk_index,
    dc.metadata,
    dc.access_level
  FROM document_chunks dc
  WHERE 
    -- FIXED: Direct column filtering instead of JSONB
    (tenant_filter IS NULL OR dc.tenant_id = tenant_filter)
    AND dc.access_level <= access_level_filter
    AND 1 - (dc.embedding <=> query_embedding) > match_threshold
  ORDER BY dc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Step 6: Create optimized hybrid search function
CREATE OR REPLACE FUNCTION hybrid_search_optimized(
  query_embedding vector(768),
  query_text text,
  tenant_filter uuid DEFAULT NULL,
  access_level_filter int DEFAULT 5,
  vector_weight float DEFAULT 0.7,
  keyword_weight float DEFAULT 0.3,
  match_count int DEFAULT 20
)
RETURNS TABLE (
  id uuid,
  content text,
  document_id uuid,
  chunk_index int,
  vector_similarity float,
  text_rank float,
  combined_score float,
  metadata jsonb
)
LANGUAGE plpgsql STABLE
AS $$
BEGIN
  -- Optimize HNSW for this query
  SET LOCAL hnsw.ef = 100;
  
  RETURN QUERY
  WITH vector_results AS (
    SELECT
      dc.id,
      dc.content,
      dc.document_id,
      dc.chunk_index,
      dc.metadata,
      1 - (dc.embedding <=> query_embedding) as similarity,
      ROW_NUMBER() OVER (ORDER BY dc.embedding <=> query_embedding) as vector_rank
    FROM document_chunks dc
    WHERE 
      (tenant_filter IS NULL OR dc.tenant_id = tenant_filter)
      AND dc.access_level <= access_level_filter
    ORDER BY dc.embedding <=> query_embedding
    LIMIT match_count * 2
  ),
  text_results AS (
    SELECT
      dc.id,
      ts_rank_cd(to_tsvector('english', dc.content), plainto_tsquery('english', query_text)) as rank,
      ROW_NUMBER() OVER (ORDER BY ts_rank_cd(to_tsvector('english', dc.content), plainto_tsquery('english', query_text)) DESC) as text_rank
    FROM document_chunks dc
    WHERE 
      (tenant_filter IS NULL OR dc.tenant_id = tenant_filter)
      AND dc.access_level <= access_level_filter
      AND to_tsvector('english', dc.content) @@ plainto_tsquery('english', query_text)
    LIMIT match_count * 2
  )
  SELECT DISTINCT ON (COALESCE(vr.id, tr.id))
    COALESCE(vr.id, dc.id) as id,
    COALESCE(vr.content, dc.content) as content,
    COALESCE(vr.document_id, dc.document_id) as document_id,
    COALESCE(vr.chunk_index, dc.chunk_index) as chunk_index,
    COALESCE(vr.similarity, 0) as vector_similarity,
    COALESCE(tr.rank, 0) as text_rank,
    -- Reciprocal Rank Fusion score
    (
      CASE WHEN vr.vector_rank IS NOT NULL 
        THEN vector_weight * (1.0 / (60 + vr.vector_rank))
        ELSE 0 
      END +
      CASE WHEN tr.text_rank IS NOT NULL 
        THEN keyword_weight * (1.0 / (60 + tr.text_rank))
        ELSE 0 
      END
    ) as combined_score,
    COALESCE(vr.metadata, dc.metadata) as metadata
  FROM vector_results vr
  FULL OUTER JOIN text_results tr ON vr.id = tr.id
  LEFT JOIN document_chunks dc ON tr.id = dc.id
  WHERE COALESCE(vr.id, tr.id) IS NOT NULL
  ORDER BY COALESCE(vr.id, tr.id), combined_score DESC
  LIMIT match_count;
END;
$$;

-- Step 7: Add GIN index for full-text search
CREATE INDEX IF NOT EXISTS document_chunks_content_gin_idx 
ON document_chunks 
USING gin(to_tsvector('english', content));

-- Step 8: Update table statistics
ANALYZE document_chunks;

-- Step 9: Verify the migration
SELECT 
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'document_chunks'
ORDER BY indexname;

-- Performance verification query (use a real tenant UUID from your database)
-- EXPLAIN (ANALYZE, BUFFERS) 
-- SELECT * FROM similarity_search(
--   ARRAY[0.1,0.2,0.3]::vector(768), -- dummy 768-dim vector
--   0.7, 
--   10, 
--   (SELECT id FROM tenants LIMIT 1), -- Use real tenant UUID
--   5
-- );

-- MIGRATION NOTES:
-- 1. HNSW provides 3-5x better performance than IVFFlat
-- 2. Fixed tenant_id type mismatch (uuid vs text)
-- 3. Added proper compound indexes for multi-tenant queries
-- 4. Enhanced functions with better parameter handling
-- 5. Added full-text search optimization
-- 
-- BREAKING CHANGES:
-- - similarity_search function signature changed (tenant_id now uuid)
-- - Old IVFFlat indexes removed
-- - Update application code to use uuid for tenant filtering
