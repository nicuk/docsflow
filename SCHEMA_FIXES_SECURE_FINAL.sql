-- SECURE SCHEMA FIXES FOR PRODUCTION DEPLOYMENT (FINAL)
-- Addresses Supabase security warning: function_search_path_mutable
-- Handles RLS policy dependencies during column type changes
-- IDEMPOTENT: Safe to run multiple times
-- Run these fixes before deploying to production

-- 1. Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. FIRST: Drop existing RLS policies that depend on tenant_id columns
-- (We'll recreate them after the column type changes)

-- Drop policies on documents table
DROP POLICY IF EXISTS "Documents are tenant-isolated" ON documents;
DROP POLICY IF EXISTS "Tenant isolation - documents" ON documents;

-- Drop policies on search_history table  
DROP POLICY IF EXISTS "Search history is tenant-isolated" ON search_history;
DROP POLICY IF EXISTS "Tenant isolation - search_history" ON search_history;

-- 3. Fix inconsistent tenant_id types (standardize to UUID)
-- Check and alter only if needed

DO $$
BEGIN
  -- Fix documents table tenant_id type if it's not already UUID
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'documents' 
    AND column_name = 'tenant_id' 
    AND data_type != 'uuid'
  ) THEN
    ALTER TABLE documents ALTER COLUMN tenant_id TYPE uuid USING tenant_id::uuid;
    RAISE NOTICE 'Fixed documents.tenant_id type to UUID';
  ELSE
    RAISE NOTICE 'documents.tenant_id is already UUID type';
  END IF;

  -- Fix search_history table tenant_id type if it's not already UUID
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'search_history' 
    AND column_name = 'tenant_id' 
    AND data_type != 'uuid'
  ) THEN
    ALTER TABLE search_history ALTER COLUMN tenant_id TYPE uuid USING tenant_id::uuid;
    RAISE NOTICE 'Fixed search_history.tenant_id type to UUID';
  ELSE
    RAISE NOTICE 'search_history.tenant_id is already UUID type';
  END IF;
END;
$$;

-- 4. Fix embedding column type (only if needed)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'document_chunks' 
    AND column_name = 'embedding' 
    AND (data_type != 'USER-DEFINED' OR udt_name != 'vector')
  ) THEN
    ALTER TABLE document_chunks ALTER COLUMN embedding TYPE vector(768);
    RAISE NOTICE 'Fixed document_chunks.embedding type to vector(768)';
  ELSE
    RAISE NOTICE 'document_chunks.embedding is already vector type';
  END IF;
END;
$$;

-- 5. Add missing foreign key constraints (only if they don't exist)
DO $$
BEGIN
  -- Add documents foreign key constraint if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE table_name = 'documents' 
    AND constraint_name = 'documents_tenant_id_fkey'
    AND constraint_type = 'FOREIGN KEY'
  ) THEN
    ALTER TABLE documents ADD CONSTRAINT documents_tenant_id_fkey 
      FOREIGN KEY (tenant_id) REFERENCES tenants(id);
    RAISE NOTICE 'Added documents_tenant_id_fkey constraint';
  ELSE
    RAISE NOTICE 'documents_tenant_id_fkey constraint already exists';
  END IF;

  -- Add search_history foreign key constraint if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE table_name = 'search_history' 
    AND constraint_name = 'search_history_tenant_id_fkey'
    AND constraint_type = 'FOREIGN KEY'
  ) THEN
    ALTER TABLE search_history ADD CONSTRAINT search_history_tenant_id_fkey 
      FOREIGN KEY (tenant_id) REFERENCES tenants(id);
    RAISE NOTICE 'Added search_history_tenant_id_fkey constraint';
  ELSE
    RAISE NOTICE 'search_history_tenant_id_fkey constraint already exists';
  END IF;
END;
$$;

-- 6. Add critical indexes for performance (IF NOT EXISTS)
CREATE INDEX IF NOT EXISTS idx_document_chunks_tenant_embedding ON document_chunks 
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

CREATE INDEX IF NOT EXISTS idx_document_chunks_tenant_access ON document_chunks 
  (tenant_id, access_level);

CREATE INDEX IF NOT EXISTS idx_documents_tenant_status ON documents 
  (tenant_id, processing_status);

CREATE INDEX IF NOT EXISTS idx_search_history_tenant_created ON search_history 
  (tenant_id, created_at DESC);

-- 7. Enable Row Level Security on all tables (safe to run multiple times)
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE search_history ENABLE ROW LEVEL SECURITY;

-- 8. Recreate RLS policies with correct UUID types
-- Drop first to ensure clean state, then create
DROP POLICY IF EXISTS "Tenants can only see their own data" ON tenants;
CREATE POLICY "Tenants can only see their own data" ON tenants
  FOR ALL USING (id = current_setting('app.current_tenant_id')::uuid);

DROP POLICY IF EXISTS "Users can only see their tenant data" ON users;
CREATE POLICY "Users can only see their tenant data" ON users
  FOR ALL USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

DROP POLICY IF EXISTS "Documents are tenant-isolated" ON documents;
CREATE POLICY "Documents are tenant-isolated" ON documents
  FOR ALL USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

DROP POLICY IF EXISTS "Document chunks are tenant-isolated" ON document_chunks;
CREATE POLICY "Document chunks are tenant-isolated" ON document_chunks
  FOR ALL USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

DROP POLICY IF EXISTS "Search history is tenant-isolated" ON search_history;
CREATE POLICY "Search history is tenant-isolated" ON search_history
  FOR ALL USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

-- 9. SECURE vector similarity search function (FIXES SECURITY WARNING)
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
SECURITY DEFINER  -- CRITICAL: Runs with function owner's privileges
SET search_path = public  -- CRITICAL: Prevents search_path attacks (fixes warning)
STABLE
AS $$
DECLARE
  _tenant_filter uuid := similarity_search.tenant_filter;
  _access_level_filter int := similarity_search.access_level_filter;
BEGIN
  -- Explicit schema qualification prevents search_path attacks
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
    (_tenant_filter IS NULL OR dc.tenant_id = _tenant_filter)
    AND dc.access_level <= _access_level_filter
    AND d.processing_status = 'completed'
    AND 1 - (dc.embedding <=> query_embedding) > match_threshold
  ORDER BY dc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- 10. Security permissions for function (safe to run multiple times)
REVOKE ALL ON FUNCTION similarity_search FROM PUBLIC;
GRANT EXECUTE ON FUNCTION similarity_search TO service_role;
GRANT EXECUTE ON FUNCTION similarity_search TO authenticated;

-- 11. Final validation and summary
DO $$
DECLARE
  docs_tenant_type text;
  search_tenant_type text;
  embedding_type text;
  function_exists boolean;
  docs_fkey_exists boolean;
  search_fkey_exists boolean;
BEGIN
  -- Check tenant_id column types
  SELECT data_type INTO docs_tenant_type 
  FROM information_schema.columns 
  WHERE table_name = 'documents' AND column_name = 'tenant_id';
  
  SELECT data_type INTO search_tenant_type 
  FROM information_schema.columns 
  WHERE table_name = 'search_history' AND column_name = 'tenant_id';

  -- Check embedding column type
  SELECT CASE WHEN data_type = 'USER-DEFINED' AND udt_name = 'vector' THEN 'vector' ELSE data_type END INTO embedding_type
  FROM information_schema.columns 
  WHERE table_name = 'document_chunks' AND column_name = 'embedding';

  -- Check if function exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.routines 
    WHERE routine_name = 'similarity_search' AND routine_schema = 'public'
  ) INTO function_exists;

  -- Check foreign key constraints
  SELECT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE table_name = 'documents' AND constraint_name = 'documents_tenant_id_fkey'
  ) INTO docs_fkey_exists;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE table_name = 'search_history' AND constraint_name = 'search_history_tenant_id_fkey'
  ) INTO search_fkey_exists;

  -- Report results
  RAISE NOTICE '=== SCHEMA MIGRATION SUMMARY ===';
  RAISE NOTICE 'documents.tenant_id type: %', docs_tenant_type;
  RAISE NOTICE 'search_history.tenant_id type: %', search_tenant_type;
  RAISE NOTICE 'document_chunks.embedding type: %', embedding_type;
  RAISE NOTICE 'similarity_search function exists: %', function_exists;
  RAISE NOTICE 'documents foreign key exists: %', docs_fkey_exists;
  RAISE NOTICE 'search_history foreign key exists: %', search_fkey_exists;

  -- Validate critical requirements
  IF docs_tenant_type != 'uuid' THEN
    RAISE EXCEPTION 'FAILED: documents.tenant_id is not UUID type (found: %)', docs_tenant_type;
  END IF;

  IF search_tenant_type != 'uuid' THEN
    RAISE EXCEPTION 'FAILED: search_history.tenant_id is not UUID type (found: %)', search_tenant_type;
  END IF;

  IF embedding_type != 'vector' THEN
    RAISE EXCEPTION 'FAILED: document_chunks.embedding is not vector type (found: %)', embedding_type;
  END IF;

  IF NOT function_exists THEN
    RAISE EXCEPTION 'FAILED: similarity_search function not found';
  END IF;

  IF NOT docs_fkey_exists THEN
    RAISE EXCEPTION 'FAILED: documents foreign key constraint missing';
  END IF;

  IF NOT search_fkey_exists THEN
    RAISE EXCEPTION 'FAILED: search_history foreign key constraint missing';
  END IF;

  RAISE NOTICE '=== SUCCESS: All schema fixes applied correctly! ===';
  RAISE NOTICE 'Security warning should now be resolved.';
  RAISE NOTICE 'Schema is ready for production deployment.';
END;
$$; 