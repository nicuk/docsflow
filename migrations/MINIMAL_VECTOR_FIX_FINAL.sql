-- ============================================================================
-- MINIMAL VECTOR FIX - FINAL VERSION (Fixes function conflict)
-- ============================================================================

BEGIN;

-- 1. Enable vector extension (safe if already exists)
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Fix the column type if needed
DO $$
BEGIN
    -- Only run if column isn't already vector type
    IF NOT EXISTS (
        SELECT 1 FROM pg_type t
        JOIN pg_attribute a ON a.atttypid = t.oid
        WHERE a.attrelid = 'document_chunks'::regclass
        AND a.attname = 'embedding'
        AND t.typname = 'vector'
    ) THEN
        -- Drop old indexes
        DROP INDEX IF EXISTS document_chunks_embedding_idx CASCADE;
        DROP INDEX IF EXISTS idx_document_chunks_embedding CASCADE;
        
        -- Fix column type
        ALTER TABLE document_chunks 
        ALTER COLUMN embedding TYPE vector(768) 
        USING embedding::text::vector(768);
        
        RAISE NOTICE '✅ Column type fixed';
    ELSE
        RAISE NOTICE '✅ Column already correct type';
    END IF;
END $$;

-- 3. Drop ALL existing similarity_search functions to avoid conflicts
DROP FUNCTION IF EXISTS similarity_search(vector(768), float, int, uuid, int);
DROP FUNCTION IF EXISTS similarity_search(vector(768), int, uuid);
DROP FUNCTION IF EXISTS similarity_search(text, int, uuid);
DROP FUNCTION IF EXISTS similarity_search CASCADE;

-- 4. Create ONE good index (not 3 different ones)
CREATE INDEX IF NOT EXISTS idx_embedding_search
ON document_chunks 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100)
WHERE embedding IS NOT NULL;

-- 5. Create the NEW similarity search function with unique signature
CREATE OR REPLACE FUNCTION similarity_search_v2(
    query_embedding vector(768),
    match_count int DEFAULT 5,
    tenant_filter uuid DEFAULT NULL
)
RETURNS TABLE (
    chunk_id uuid,
    document_id uuid,
    content text,
    metadata jsonb,
    similarity float4,
    tenant_id uuid
)
LANGUAGE sql
STABLE
AS $$
    SELECT 
        id as chunk_id,
        document_id,
        content,
        metadata,
        (1 - (embedding <=> query_embedding))::float4 as similarity,
        tenant_id
    FROM document_chunks
    WHERE 
        embedding IS NOT NULL
        AND (tenant_filter IS NULL OR tenant_id = tenant_filter)
    ORDER BY embedding <=> query_embedding
    LIMIT match_count;
$$;

-- 6. Grant permissions
GRANT EXECUTE ON FUNCTION similarity_search_v2 TO authenticated;

-- 7. Update statistics
ANALYZE document_chunks;

COMMIT;

-- Test with:
-- SELECT * FROM similarity_search_v2(
--     (SELECT embedding FROM document_chunks WHERE embedding IS NOT NULL LIMIT 1),
--     5
-- );
