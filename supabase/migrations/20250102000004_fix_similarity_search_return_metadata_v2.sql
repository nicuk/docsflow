-- Fix similarity_search to return document metadata (filename, tenant_id, etc.)
-- This fixes the "Unknown (page 1)" bug where sources don't show proper filenames
-- ✅ SAFE: Only uses columns that exist in actual schema
-- Version 2: Simplified to handle single function version

-- Step 1: Verify columns exist before migration
DO $$
BEGIN
  -- Check if required columns exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'documents' AND column_name = 'filename'
  ) THEN
    RAISE EXCEPTION 'documents.filename column does not exist - cannot proceed';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'documents' AND column_name = 'tenant_id'
  ) THEN
    RAISE EXCEPTION 'documents.tenant_id column does not exist - cannot proceed';
  END IF;
  
  RAISE NOTICE '✅ All required columns exist - proceeding with migration';
END $$;

-- Step 2: Drop the existing function (single version)
-- Get the exact signature and drop it
DO $$ 
DECLARE
  func_signature text;
BEGIN
  -- Get the exact function signature
  SELECT oid::regprocedure::text INTO func_signature
  FROM pg_proc
  WHERE proname = 'similarity_search'
    AND pronamespace = 'public'::regnamespace
  LIMIT 1;
  
  IF func_signature IS NOT NULL THEN
    EXECUTE 'DROP FUNCTION IF EXISTS ' || func_signature || ' CASCADE';
    RAISE NOTICE '✅ Dropped existing function: %', func_signature;
  ELSE
    RAISE NOTICE '⚠️ No existing similarity_search function found';
  END IF;
END $$;

-- Step 3: Create new function with proper metadata
CREATE OR REPLACE FUNCTION similarity_search(
  query_embedding vector(768),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 5,
  tenant_id text DEFAULT NULL,
  access_level int DEFAULT 1
)
RETURNS TABLE (
  id uuid,
  content text,
  similarity float,
  document_id uuid,
  chunk_index int,
  -- 🎯 NEW: Return document metadata for proper source attribution
  -- ✅ SAFE: Only using columns that exist in actual schema
  filename text,
  tenant_id uuid,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  processing_status text,
  document_category text,
  chunk_metadata jsonb,  -- Contains page info
  document_metadata jsonb -- Contains additional document info
)
LANGUAGE sql STABLE
AS $$
  SELECT
    dc.id,
    dc.content,
    1 - (dc.embedding <=> query_embedding) as similarity,
    dc.document_id,
    dc.chunk_index,
    -- 🎯 NEW: Include document metadata (only existing columns)
    d.filename,
    d.tenant_id,
    d.created_at,
    d.updated_at,
    d.processing_status,
    d.document_category,
    dc.metadata as chunk_metadata,  -- Chunk metadata (may contain page number)
    d.metadata as document_metadata -- Document metadata
  FROM document_chunks as dc
  JOIN documents d ON d.id = dc.document_id
  JOIN tenants t ON d.tenant_id = t.id
  WHERE 
    (similarity_search.tenant_id IS NULL OR CAST(t.id AS text) = similarity_search.tenant_id)
    -- 🎯 FIX: Use dc.access_level (chunk-level) not t.access_level (doesn't exist on tenants)
    AND dc.access_level <= similarity_search.access_level
    AND 1 - (dc.embedding <=> query_embedding) > match_threshold
  ORDER BY dc.embedding <=> query_embedding
  LIMIT match_count;
$$;

-- Add helpful comment
COMMENT ON FUNCTION similarity_search IS 
'Vector similarity search with full document metadata for source attribution. Returns filename, tenant_id, timestamps, and metadata fields.';

-- 🎯 VERIFICATION: Test the function returns metadata
DO $$
DECLARE
  sample_embedding vector(768);
  result_count int;
  null_filename_count int;
  null_tenant_count int;
  sample_filename text;
  sample_tenant text;
BEGIN
  -- Get a sample embedding
  SELECT embedding INTO sample_embedding 
  FROM document_chunks 
  WHERE embedding IS NOT NULL
  LIMIT 1;
  
  IF sample_embedding IS NOT NULL THEN
    -- Test the function
    SELECT COUNT(*) INTO result_count
    FROM similarity_search(sample_embedding, 0.1, 10, NULL, 1);
    
    -- Check for NULL filenames
    SELECT COUNT(*) INTO null_filename_count
    FROM similarity_search(sample_embedding, 0.1, 10, NULL, 1)
    WHERE filename IS NULL;
    
    -- Check for NULL tenant_id
    SELECT COUNT(*) INTO null_tenant_count
    FROM similarity_search(sample_embedding, 0.1, 10, NULL, 1)
    WHERE tenant_id IS NULL;
    
    -- Get sample values
    SELECT filename, tenant_id::text 
    INTO sample_filename, sample_tenant
    FROM similarity_search(sample_embedding, 0.1, 1, NULL, 1)
    LIMIT 1;
    
    RAISE NOTICE '✅ similarity_search test completed:';
    RAISE NOTICE '   - Found % results', result_count;
    RAISE NOTICE '   - % with NULL filename', null_filename_count;
    RAISE NOTICE '   - % with NULL tenant_id', null_tenant_count;
    
    IF result_count > 0 THEN
      RAISE NOTICE '   - Sample result: filename=%, tenant=%', sample_filename, sample_tenant;
    END IF;
      
    IF null_filename_count > 0 THEN
      RAISE WARNING '⚠️ % documents have NULL filenames - check documents table data quality', null_filename_count;
    END IF;
    
    IF null_tenant_count > 0 THEN
      RAISE WARNING '🚨 CRITICAL: % documents have NULL tenant_id - data integrity issue!', null_tenant_count;
    END IF;
    
    IF null_filename_count = 0 AND null_tenant_count = 0 THEN
      RAISE NOTICE '🎉 All checks passed - function working correctly';
    END IF;
  ELSE
    RAISE NOTICE '⚠️ No embeddings found in document_chunks - cannot test function';
    RAISE NOTICE '   This is expected if no documents have been uploaded yet';
  END IF;
END $$;

-- Final success message
DO $$
BEGIN
  RAISE NOTICE '================================';
  RAISE NOTICE '✅ Migration completed successfully!';
  RAISE NOTICE '================================';
  RAISE NOTICE 'The similarity_search function now returns:';
  RAISE NOTICE '  • filename (for proper source attribution)';
  RAISE NOTICE '  • tenant_id (for security verification)';
  RAISE NOTICE '  • metadata (for page numbers and other info)';
  RAISE NOTICE '  • timestamps and processing status';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '  1. Test in your chat interface';
  RAISE NOTICE '  2. Sources should now show actual filenames';
  RAISE NOTICE '  3. Run RAGAS diagnostic if needed: scripts/diagnose-rag-with-ragas.ts';
END $$;

