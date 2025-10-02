-- ============================================================================
-- FIX: Convert embedding data from TEXT/JSON to vector(768)
-- ============================================================================
-- ISSUE: Embeddings stored as JSON text "[0.1,0.2,...]" not vector(768)
-- IMPACT: similarity_search can't compare text strings, returns 0 results
-- ============================================================================

BEGIN;

-- 1. Check current state
DO $$
DECLARE
    current_type text;
    sample_embedding text;
BEGIN
    -- Get column type
    SELECT data_type INTO current_type
    FROM information_schema.columns
    WHERE table_name = 'document_chunks' 
      AND column_name = 'embedding';
    
    RAISE NOTICE 'Current embedding column type: %', current_type;
    
    -- Get sample data
    SELECT embedding::text INTO sample_embedding
    FROM document_chunks
    WHERE embedding IS NOT NULL
    LIMIT 1;
    
    RAISE NOTICE 'Sample embedding format: %', LEFT(sample_embedding, 100);
END $$;

-- 2. Create a temporary column with correct vector type
ALTER TABLE document_chunks 
ADD COLUMN embedding_vector vector(768);

-- 3. Convert existing JSON text embeddings to vector type
-- This handles the format: "[0.1,0.2,0.3,...]" → vector
UPDATE document_chunks
SET embedding_vector = embedding::text::vector(768)
WHERE embedding IS NOT NULL;

-- 4. Verify conversion worked
DO $$
DECLARE
    converted_count int;
    total_with_embeddings int;
BEGIN
    SELECT COUNT(*) INTO converted_count
    FROM document_chunks
    WHERE embedding_vector IS NOT NULL;
    
    SELECT COUNT(*) INTO total_with_embeddings
    FROM document_chunks
    WHERE embedding IS NOT NULL;
    
    RAISE NOTICE '✅ Converted % of % embeddings', converted_count, total_with_embeddings;
    
    IF converted_count != total_with_embeddings THEN
        RAISE EXCEPTION 'Conversion failed! Not all embeddings converted.';
    END IF;
END $$;

-- 5. Drop old column and rename new one
ALTER TABLE document_chunks DROP COLUMN embedding;
ALTER TABLE document_chunks RENAME COLUMN embedding_vector TO embedding;

-- 6. Recreate HNSW index for fast vector search
CREATE INDEX IF NOT EXISTS idx_document_chunks_embedding_hnsw 
ON document_chunks 
USING hnsw (embedding vector_cosine_ops)
WHERE embedding IS NOT NULL;

-- 7. Final verification
DO $$
DECLARE
    index_exists boolean;
    column_type text;
BEGIN
    -- Check index
    SELECT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE tablename = 'document_chunks' 
        AND indexname = 'idx_document_chunks_embedding_hnsw'
    ) INTO index_exists;
    
    -- Check column type
    SELECT udt_name INTO column_type
    FROM information_schema.columns
    WHERE table_name = 'document_chunks' 
      AND column_name = 'embedding';
    
    RAISE NOTICE '✅ HNSW Index exists: %', index_exists;
    RAISE NOTICE '✅ Embedding column type: %', column_type;
    
    IF NOT index_exists THEN
        RAISE EXCEPTION 'HNSW index not created!';
    END IF;
    
    IF column_type != 'vector' THEN
        RAISE EXCEPTION 'Column type still wrong: %', column_type;
    END IF;
END $$;

COMMIT;

-- 8. Test the conversion with actual similarity_search
SELECT 
    '✅ FINAL TEST' as test_name,
    COUNT(*) as results_found
FROM similarity_search(
    (SELECT embedding FROM document_chunks WHERE embedding IS NOT NULL LIMIT 1),
    'b89b8fab-0a25-4266-a4d0-306cc4d358cb'::uuid,  -- sculptai tenant
    5,  -- access_level_filter
    0.01,  -- very low threshold
    10  -- match_count
);

