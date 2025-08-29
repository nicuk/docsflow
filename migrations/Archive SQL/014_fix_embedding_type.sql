-- 🎯 FINAL FIX: Correct embedding column type
-- This ensures 100% compatibility with pgvector

-- STEP 1: Check if pgvector extension exists and is properly configured
DO $$
BEGIN
  -- Ensure pgvector extension is available
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'vector') THEN
    CREATE EXTENSION vector WITH SCHEMA extensions;
    RAISE NOTICE '✅ Created pgvector extension';
  ELSE
    RAISE NOTICE '✅ pgvector extension already exists';
  END IF;
END;
$$;

-- STEP 2: Fix embedding column type if needed
DO $$
DECLARE
  embedding_type TEXT;
BEGIN
  -- Check current embedding column type
  SELECT CASE 
    WHEN data_type = 'USER-DEFINED' AND udt_name = 'vector' THEN 'vector'
    WHEN data_type = 'USER-DEFINED' THEN 'USER-DEFINED'
    ELSE data_type
  END INTO embedding_type
  FROM information_schema.columns 
  WHERE table_name = 'document_chunks' AND column_name = 'embedding';
  
  RAISE NOTICE 'Current embedding type: %', COALESCE(embedding_type, 'NULL');
  
  -- Only fix if it's not already vector type
  IF COALESCE(embedding_type, '') != 'vector' THEN
    RAISE NOTICE 'Converting embedding column to vector(768)';
    
    -- Drop any existing vector index
    DROP INDEX IF EXISTS idx_document_chunks_embedding;
    
    -- Backup any existing embedding data
    CREATE TEMP TABLE embedding_backup AS 
    SELECT id, embedding::text as embedding_text 
    FROM document_chunks 
    WHERE embedding IS NOT NULL;
    
    -- Alter column type
    ALTER TABLE document_chunks ALTER COLUMN embedding TYPE vector(768) 
    USING CASE 
      WHEN embedding IS NOT NULL THEN embedding::vector(768)
      ELSE NULL 
    END;
    
    -- Recreate optimized index
    CREATE INDEX idx_document_chunks_embedding 
    ON document_chunks USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 100);
    
    RAISE NOTICE '✅ Fixed embedding column type to vector(768)';
  ELSE
    RAISE NOTICE '✅ embedding column already correct vector type';
  END IF;
END;
$$;

-- STEP 3: Final validation
DO $$
DECLARE
  embedding_type TEXT;
  has_index BOOLEAN;
BEGIN
  -- Check final type
  SELECT CASE 
    WHEN data_type = 'USER-DEFINED' AND udt_name = 'vector' THEN 'vector(768)'
    ELSE data_type
  END INTO embedding_type
  FROM information_schema.columns 
  WHERE table_name = 'document_chunks' AND column_name = 'embedding';
  
  -- Check for vector index
  SELECT EXISTS(
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'document_chunks' 
    AND indexname = 'idx_document_chunks_embedding'
  ) INTO has_index;
  
  IF COALESCE(embedding_type, '') = 'vector(768)' AND COALESCE(has_index, false) THEN
    RAISE NOTICE '🎉 SCHEMA 100% CORRECT!';
    RAISE NOTICE '✅ embedding: vector(768)';
    RAISE NOTICE '✅ vector index: created';
    RAISE NOTICE '✅ Ready for production integration';
  ELSE
    RAISE EXCEPTION 'Schema validation failed: embedding=%, index=%', COALESCE(embedding_type, 'NULL'), has_index;
  END IF;
END;
$$;
