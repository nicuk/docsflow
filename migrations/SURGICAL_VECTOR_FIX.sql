-- ============================================================================
-- SURGICAL VECTOR FIX - Based on Schema Analysis
-- ============================================================================
-- ISSUE: embedding column is USER-DEFINED instead of vector(768)
-- ERROR: "SET is not allowed in a non-volatile function"

BEGIN;

-- 1. First, check current function volatility
DO $$
DECLARE
    func_volatility CHAR;
BEGIN
    SELECT provolatile INTO func_volatility
    FROM pg_proc 
    WHERE proname = 'similarity_search'
    LIMIT 1;
    
    IF func_volatility = 's' THEN
        RAISE NOTICE '❌ Function is STABLE - needs VOLATILE fix';
    ELSIF func_volatility = 'v' THEN
        RAISE NOTICE '✅ Function is already VOLATILE';
    ELSE
        RAISE NOTICE '⚠️ Function not found or has different volatility';
    END IF;
END $$;

-- 2. Check embedding column type
DO $$
DECLARE
    col_type TEXT;
BEGIN
    SELECT udt_name INTO col_type
    FROM information_schema.columns 
    WHERE table_name = 'document_chunks' 
    AND column_name = 'embedding';
    
    IF col_type = 'vector' THEN
        RAISE NOTICE '✅ Embedding column is already vector type';
    ELSE
        RAISE NOTICE '❌ Embedding column is: % (should be vector)', col_type;
        
        -- Fix the column type
        ALTER TABLE document_chunks 
        ALTER COLUMN embedding TYPE vector(768)
        USING CASE 
            WHEN embedding IS NOT NULL THEN embedding::vector(768)
            ELSE NULL 
        END;
        
        RAISE NOTICE '✅ Fixed embedding column to vector(768)';
    END IF;
END $$;

-- 3. Create/Replace similarity_search function with correct signature
-- This matches what your TypeScript code is calling
DROP FUNCTION IF EXISTS similarity_search CASCADE;

CREATE OR REPLACE FUNCTION similarity_search(
  query_embedding vector(768),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 10,
  tenant_filter uuid DEFAULT NULL,
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
    dc.embedding IS NOT NULL
    AND (tenant_filter IS NULL OR dc.tenant_id = tenant_filter)
    AND dc.access_level <= access_level_filter
    AND 1 - (dc.embedding <=> query_embedding) > match_threshold
  ORDER BY dc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- 4. Grant permissions
GRANT EXECUTE ON FUNCTION similarity_search TO authenticated;
GRANT EXECUTE ON FUNCTION similarity_search TO anon;

-- 5. Ensure proper index exists
CREATE INDEX IF NOT EXISTS idx_document_chunks_embedding_hnsw
ON document_chunks 
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64)
WHERE embedding IS NOT NULL;

-- 6. Update table statistics
ANALYZE document_chunks;

COMMIT;

-- 7. Test the function
DO $$
DECLARE
    test_embedding vector(768) := array_fill(0.1, ARRAY[768])::vector(768);
    result_count INT;
BEGIN
    SELECT COUNT(*) INTO result_count
    FROM similarity_search(
        test_embedding,
        0.1,  -- Low threshold for testing
        5,    -- Small limit
        NULL, -- Any tenant
        5     -- Any access level
    );
    
    RAISE NOTICE '✅ Function test completed - found % results', result_count;
END $$;
