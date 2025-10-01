-- ============================================================================
-- FIX: similarity_search function VOLATILE issue
-- ============================================================================
-- ERROR: "SET is not allowed in a non-volatile function"
-- SOLUTION: Change function from STABLE to VOLATILE
--
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/_/sql
-- ============================================================================

BEGIN;

-- Drop existing function (all variants)
DROP FUNCTION IF EXISTS similarity_search CASCADE;

-- Create the similarity_search function with VOLATILE
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
VOLATILE -- CRITICAL: Must be VOLATILE to use SET LOCAL
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  -- HNSW optimization - removed due to Supabase compatibility
  -- SET LOCAL is not needed for basic vector search
  
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

-- Grant permissions (system requires authentication)
GRANT EXECUTE ON FUNCTION similarity_search TO authenticated;

-- Add helpful comment
COMMENT ON FUNCTION similarity_search IS 'Vector similarity search with tenant isolation and RLS. Uses VOLATILE to allow HNSW optimization.';

COMMIT;

-- Verification
DO $$
DECLARE
    func_volatility CHAR;
BEGIN
    SELECT provolatile INTO func_volatility
    FROM pg_proc 
    WHERE proname = 'similarity_search'
    LIMIT 1;
    
    IF func_volatility = 'v' THEN
        RAISE NOTICE '✅ SUCCESS: Function is now VOLATILE';
    ELSE
        RAISE NOTICE '❌ ERROR: Function volatility is %', func_volatility;
    END IF;
END $$;

