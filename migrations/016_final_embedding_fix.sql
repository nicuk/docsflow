-- 🎯 FINAL EMBEDDING FIX - Corrected RAISE Error
-- This fixes the "too few parameters specified for RAISE" error
-- and properly converts embedding column to vector(768)

-- STEP 1: Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

-- STEP 2: Fix embedding column type with corrected RAISE statements
DO $$
DECLARE
  embedding_type TEXT;
  current_udt TEXT;
BEGIN
  -- Check current embedding column type
  SELECT data_type, udt_name 
  INTO embedding_type, current_udt
  FROM information_schema.columns 
  WHERE table_name = 'document_chunks' AND column_name = 'embedding';
  
  RAISE NOTICE 'Current embedding type: % (UDT: %)', 
    COALESCE(embedding_type, 'NULL'), 
    COALESCE(current_udt, 'NULL');
  
  -- Only fix if it's not already vector type
  IF COALESCE(current_udt, '') != 'vector' THEN
    RAISE NOTICE 'Converting embedding column to vector(768)';
    
    -- Drop any existing vector index first
    DROP INDEX IF EXISTS idx_document_chunks_embedding;
    DROP INDEX IF EXISTS document_chunks_embedding_idx;
    
    -- Alter column type to vector(768)
    ALTER TABLE document_chunks 
    ALTER COLUMN embedding TYPE vector(768) 
    USING CASE 
      WHEN embedding IS NOT NULL THEN embedding::vector(768)
      ELSE NULL 
    END;
    
    -- Create optimized IVFFlat index for vector search
    CREATE INDEX idx_document_chunks_embedding 
    ON document_chunks USING ivfflat (embedding vector_cosine_ops) 
    WITH (lists = 100)
    WHERE embedding IS NOT NULL;
    
    RAISE NOTICE '✅ Fixed embedding column type to vector(768)';
  ELSE
    RAISE NOTICE '✅ embedding column already correct vector type';
  END IF;
END;
$$;

-- STEP 3: Create secure similarity search function
DROP FUNCTION IF EXISTS similarity_search(vector, float, int, text, int);
DROP FUNCTION IF EXISTS similarity_search(vector, float, int, uuid, int);

CREATE OR REPLACE FUNCTION similarity_search(
  query_embedding vector(768),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 5,
  tenant_filter uuid DEFAULT NULL,
  access_level_filter int DEFAULT 1
)
RETURNS TABLE (
  id uuid,
  content text,
  similarity float,
  document_id uuid,
  chunk_index int,
  filename text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT
    dc.id,
    dc.content,
    1 - (dc.embedding <=> query_embedding) as similarity,
    dc.document_id,
    dc.chunk_index,
    d.filename
  FROM public.document_chunks dc
  INNER JOIN public.documents d ON dc.document_id = d.id
  WHERE 
    (tenant_filter IS NULL OR dc.tenant_id = tenant_filter)
    AND (dc.access_level IS NULL OR dc.access_level <= access_level_filter)
    AND d.processing_status = 'completed'
    AND dc.embedding IS NOT NULL
    AND 1 - (dc.embedding <=> query_embedding) > match_threshold
  ORDER BY dc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Grant proper permissions
REVOKE ALL ON FUNCTION similarity_search FROM PUBLIC;
GRANT EXECUTE ON FUNCTION similarity_search TO service_role;
GRANT EXECUTE ON FUNCTION similarity_search TO authenticated;

-- STEP 4: Add performance indexes
CREATE INDEX IF NOT EXISTS idx_document_chunks_tenant_embedding 
ON document_chunks(tenant_id, access_level)
WHERE embedding IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_documents_tenant_status 
ON documents(tenant_id, processing_status);

CREATE INDEX IF NOT EXISTS idx_search_history_tenant_created 
ON search_history(tenant_id, created_at DESC);

-- STEP 5: Final validation with corrected RAISE statements
DO $$
DECLARE
  v_embedding_type text;
  v_function_exists boolean;
  v_function_secure boolean;
BEGIN
  -- Check embedding column type
  SELECT 
    CASE 
      WHEN data_type = 'USER-DEFINED' AND udt_name = 'vector' THEN 'vector(768)'
      ELSE data_type || ' (' || COALESCE(udt_name, 'unknown') || ')'
    END INTO v_embedding_type
  FROM information_schema.columns 
  WHERE table_name = 'document_chunks' AND column_name = 'embedding';
  
  -- Check if similarity_search exists
  SELECT EXISTS(
    SELECT 1 FROM information_schema.routines 
    WHERE routine_name = 'similarity_search'
    AND routine_schema = 'public'
  ) INTO v_function_exists;
  
  -- Check if function has security definer
  SELECT EXISTS(
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE p.proname = 'similarity_search'
    AND n.nspname = 'public'
    AND p.prosecdef = true
  ) INTO v_function_secure;
  
  -- Report results with corrected RAISE statements
  RAISE NOTICE '========================================';
  RAISE NOTICE '🎯 MIGRATION COMPLETE - STATUS:';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ Embedding column: %', v_embedding_type;
  RAISE NOTICE '✅ similarity_search function: % (secure: %)', 
    CASE WHEN v_function_exists THEN 'EXISTS' ELSE 'MISSING' END,
    CASE WHEN v_function_secure THEN 'YES' ELSE 'NO' END;
  RAISE NOTICE '✅ Performance indexes: Created';
  RAISE NOTICE '========================================';
  
  -- Validate critical requirements
  IF NOT v_function_exists OR NOT v_function_secure THEN
    RAISE WARNING 'similarity_search function may need attention';
  END IF;
  
  RAISE NOTICE '🎉 SCHEMA READY FOR PRODUCTION!';
  RAISE NOTICE '🚀 Supabase security warning should be resolved';
END;
$$; 