-- ============================================================================
-- CREATE similarity_search FUNCTION FOR VECTOR SEARCH
-- ============================================================================
-- This function is required for RAG vector search functionality
-- Without it, the system falls back to slow keyword-only search causing timeouts
-- ============================================================================

BEGIN;

-- Drop existing function if it exists (all variants)
DROP FUNCTION IF EXISTS similarity_search CASCADE;

-- Create the similarity_search function
CREATE OR REPLACE FUNCTION similarity_search(
  query_embedding vector(768),
  tenant_filter uuid DEFAULT NULL,
  access_level_filter int DEFAULT 5,
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 10
)
RETURNS TABLE (
  chunk_id uuid,
  document_id uuid,
  content text,
  similarity float,
  confidence_score float,
  chunk_index int,
  metadata jsonb,
  access_level int
)
LANGUAGE plpgsql 
VOLATILE -- Must be VOLATILE for SET LOCAL statements
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    dc.id as chunk_id,
    dc.document_id,
    dc.content,
    (1 - (dc.embedding <=> query_embedding))::float as similarity,
    (1 - (dc.embedding <=> query_embedding))::float as confidence_score,
    dc.chunk_index,
    dc.metadata,
    dc.access_level
  FROM document_chunks dc
  WHERE 
    dc.embedding IS NOT NULL
    AND (tenant_filter IS NULL OR dc.tenant_id = tenant_filter)
    AND (access_level_filter IS NULL OR dc.access_level IS NULL OR dc.access_level <= access_level_filter)
    AND (1 - (dc.embedding <=> query_embedding)) > match_threshold
  ORDER BY dc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION similarity_search TO authenticated;
GRANT EXECUTE ON FUNCTION similarity_search TO anon;

-- Add comment
COMMENT ON FUNCTION similarity_search IS 'Vector similarity search with tenant isolation. Returns top K most similar document chunks based on cosine similarity.';

COMMIT;

-- Verification query to confirm function exists
DO $$
DECLARE
    func_count int;
BEGIN
    SELECT COUNT(*) INTO func_count
    FROM pg_proc 
    WHERE proname = 'similarity_search';
    
    IF func_count > 0 THEN
        RAISE NOTICE '✅ similarity_search function created successfully';
    ELSE
        RAISE EXCEPTION '❌ ERROR: similarity_search function not found after creation';
    END IF;
END $$;

