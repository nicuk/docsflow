-- Fix for vector search functions: STABLE vs VOLATILE issue
-- Functions using SET LOCAL must be VOLATILE, not STABLE
-- This migration fixes all similarity_search functions to use VOLATILE

BEGIN;

-- Drop existing similarity_search functions (all variants)
DROP FUNCTION IF EXISTS similarity_search(vector(768), float, int, text, int) CASCADE;
DROP FUNCTION IF EXISTS similarity_search(vector(1536), float, int, text, int) CASCADE;
DROP FUNCTION IF EXISTS similarity_search_v2(vector(768), float, int, text, int) CASCADE;
DROP FUNCTION IF EXISTS similarity_search_optimized(vector(768), float, int, text, int) CASCADE;

-- Create the definitive similarity_search function with VOLATILE
CREATE OR REPLACE FUNCTION similarity_search(
  query_embedding vector(768),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 5,
  p_tenant_id text DEFAULT NULL,
  p_access_level int DEFAULT 1
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
LANGUAGE plpgsql 
VOLATILE -- CRITICAL: Must be VOLATILE to use SET LOCAL
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- HNSW optimization (now allowed with VOLATILE)
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
    -- Tenant filter
    (p_tenant_id IS NULL OR dc.metadata->>'tenant_id' = p_tenant_id)
    -- Access level filter
    AND (p_access_level IS NULL OR dc.access_level IS NULL OR dc.access_level <= p_access_level)
    -- Similarity threshold
    AND (1 - (dc.embedding <=> query_embedding)) > match_threshold
  ORDER BY dc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Create a hybrid search function (semantic + keyword) with VOLATILE
CREATE OR REPLACE FUNCTION hybrid_search(
  query_embedding vector(768),
  query_text text,
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 10,
  p_tenant_id text DEFAULT NULL,
  p_access_level int DEFAULT 1
)
RETURNS TABLE (
  id uuid,
  content text,
  similarity float,
  keyword_rank float,
  combined_score float,
  metadata jsonb
)
LANGUAGE plpgsql 
VOLATILE -- CRITICAL: Must be VOLATILE to use SET LOCAL
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Optimize HNSW for this query
  SET LOCAL hnsw.ef = 100;
  
  RETURN QUERY
  WITH vector_results AS (
    SELECT 
      dc.id,
      dc.content,
      1 - (dc.embedding <=> query_embedding) as similarity,
      dc.metadata
    FROM document_chunks dc
    WHERE 
      (p_tenant_id IS NULL OR dc.metadata->>'tenant_id' = p_tenant_id)
      AND (p_access_level IS NULL OR dc.access_level IS NULL OR dc.access_level <= p_access_level)
      AND (1 - (dc.embedding <=> query_embedding)) > match_threshold
    ORDER BY dc.embedding <=> query_embedding
    LIMIT match_count * 2
  ),
  keyword_results AS (
    SELECT 
      dc.id,
      dc.content,
      ts_rank_cd(to_tsvector('english', dc.content), plainto_tsquery('english', query_text)) as keyword_rank,
      dc.metadata
    FROM document_chunks dc
    WHERE 
      (p_tenant_id IS NULL OR dc.metadata->>'tenant_id' = p_tenant_id)
      AND (p_access_level IS NULL OR dc.access_level IS NULL OR dc.access_level <= p_access_level)
      AND to_tsvector('english', dc.content) @@ plainto_tsquery('english', query_text)
    ORDER BY keyword_rank DESC
    LIMIT match_count * 2
  )
  SELECT 
    COALESCE(v.id, k.id) as id,
    COALESCE(v.content, k.content) as content,
    COALESCE(v.similarity, 0) as similarity,
    COALESCE(k.keyword_rank, 0) as keyword_rank,
    (COALESCE(v.similarity, 0) * 0.7 + COALESCE(k.keyword_rank, 0) * 0.3) as combined_score,
    COALESCE(v.metadata, k.metadata) as metadata
  FROM vector_results v
  FULL OUTER JOIN keyword_results k ON v.id = k.id
  ORDER BY combined_score DESC
  LIMIT match_count;
END;
$$;

-- Grant permissions to authenticated users
GRANT EXECUTE ON FUNCTION similarity_search TO authenticated;
GRANT EXECUTE ON FUNCTION hybrid_search TO authenticated;

-- Add helpful comment
COMMENT ON FUNCTION similarity_search IS 'Vector similarity search with HNSW optimization. Uses VOLATILE to allow SET LOCAL.';
COMMENT ON FUNCTION hybrid_search IS 'Hybrid search combining vector similarity and keyword matching. Uses VOLATILE to allow SET LOCAL.';

COMMIT;

-- Verification query
DO $$
BEGIN
  RAISE NOTICE 'Migration complete. Functions changed to VOLATILE to allow SET LOCAL commands.';
  RAISE NOTICE 'This fixes the "SET is not allowed in a non-volatile function" error.';
  RAISE NOTICE 'Run this migration in Supabase SQL Editor to fix vector search.';
END $$;
