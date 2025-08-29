-- 🚨 EMERGENCY VECTOR SEARCH FIX
-- Run this IMMEDIATELY in Supabase SQL Editor
-- This fixes the "operator does not exist: extensions.vector <=> extensions.vector" error

-- Step 1: Enable vector extension properly
CREATE EXTENSION IF NOT EXISTS vector;

-- Step 2: Fix the embedding column type (currently shows as USER-DEFINED)
DO $$
BEGIN
  -- Check current state
  RAISE NOTICE 'Starting emergency vector fix...';
  
  -- Drop any broken indexes first
  DROP INDEX IF EXISTS idx_document_chunks_embedding;
  DROP INDEX IF EXISTS document_chunks_embedding_idx;
  
  -- Fix the column type
  ALTER TABLE document_chunks 
  ALTER COLUMN embedding TYPE vector(768)
  USING CASE 
    WHEN embedding IS NOT NULL THEN embedding::vector(768)
    ELSE NULL 
  END;
  
  -- Recreate the index
  CREATE INDEX idx_document_chunks_embedding 
  ON document_chunks 
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100)
  WHERE embedding IS NOT NULL;
  
  RAISE NOTICE '✅ Fixed embedding column to vector(768)';
END $$;

-- Step 3: Create/Replace the similarity_search function with CORRECT typing
CREATE OR REPLACE FUNCTION similarity_search(
  query_embedding vector(768),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 5,
  tenant_filter uuid DEFAULT NULL,
  access_level_filter int DEFAULT 5
)
RETURNS TABLE (
  id uuid,
  document_id uuid,
  chunk_index int,
  content text,
  metadata jsonb,
  similarity float,
  filename text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    dc.id,
    dc.document_id,
    dc.chunk_index,
    dc.content,
    dc.metadata,
    1 - (dc.embedding <=> query_embedding) as similarity,
    d.filename
  FROM document_chunks dc
  JOIN documents d ON dc.document_id = d.id
  WHERE 
    dc.tenant_id = tenant_filter
    AND dc.access_level <= access_level_filter
    AND dc.embedding IS NOT NULL
    AND 1 - (dc.embedding <=> query_embedding) > match_threshold
  ORDER BY dc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Step 4: Verify the fix
DO $$
DECLARE
  col_type text;
BEGIN
  SELECT data_type || ' (' || udt_name || ')' INTO col_type
  FROM information_schema.columns 
  WHERE table_name = 'document_chunks' 
  AND column_name = 'embedding';
  
  RAISE NOTICE 'Embedding column type is now: %', col_type;
  
  IF col_type LIKE '%vector%' THEN
    RAISE NOTICE '🎉 VECTOR SEARCH FIXED! Ready for production.';
  ELSE
    RAISE EXCEPTION '❌ Vector type still not correct: %', col_type;
  END IF;
END $$;
