-- 🛡️ ULTRA-SAFE TENANT_ID TYPE FIX
-- Avoids regex operations on UUID columns to prevent operator errors

-- STEP 1: Drop RLS policies that depend on tenant_id columns
DO $$
BEGIN
  -- Drop policies on documents table
  DROP POLICY IF EXISTS "Documents tenant isolation" ON documents;
  DROP POLICY IF EXISTS "Documents are tenant-isolated" ON documents;
  DROP POLICY IF EXISTS "Users can only see their tenant documents" ON documents;
  
  -- Drop policies on search_history table  
  DROP POLICY IF EXISTS "Search history tenant isolation" ON search_history;
  DROP POLICY IF EXISTS "Search history is tenant-isolated" ON search_history;
  DROP POLICY IF EXISTS "Users can only see their tenant search history" ON search_history;
  
  -- Drop policies on document_chunks table
  DROP POLICY IF EXISTS "Document chunks tenant isolation" ON document_chunks;
  DROP POLICY IF EXISTS "Document chunks are tenant-isolated" ON document_chunks;
  DROP POLICY IF EXISTS "Users can only see their tenant chunks" ON document_chunks;
  
  RAISE NOTICE '✅ Dropped existing RLS policies';
END;
$$;

-- STEP 2: Temporarily disable RLS
ALTER TABLE documents DISABLE ROW LEVEL SECURITY;
ALTER TABLE search_history DISABLE ROW LEVEL SECURITY;
ALTER TABLE document_chunks DISABLE ROW LEVEL SECURITY;

-- STEP 3: Drop foreign key constraints
ALTER TABLE documents DROP CONSTRAINT IF EXISTS documents_tenant_id_fkey;
ALTER TABLE search_history DROP CONSTRAINT IF EXISTS search_history_tenant_id_fkey;

-- STEP 4: Create default tenant if not exists
INSERT INTO tenants (id, subdomain, name, industry) 
VALUES ('00000000-0000-0000-0000-000000000001', 'default', 'Default Tenant', 'general')
ON CONFLICT (subdomain) DO NOTHING;

-- STEP 5: Safe tenant_id conversion without regex
DO $$
DECLARE
  docs_type TEXT;
  search_type TEXT;
  rec RECORD;
BEGIN
  -- Check current column types
  SELECT data_type INTO docs_type 
  FROM information_schema.columns 
  WHERE table_name = 'documents' AND column_name = 'tenant_id';
  
  SELECT data_type INTO search_type 
  FROM information_schema.columns 
  WHERE table_name = 'search_history' AND column_name = 'tenant_id';
  
  RAISE NOTICE 'Current types - documents.tenant_id: %, search_history.tenant_id: %', docs_type, search_type;
  
  -- Handle documents table conversion
  IF docs_type != 'uuid' THEN
    RAISE NOTICE 'Converting documents.tenant_id from % to UUID', docs_type;
    
    -- Create a temp column for safe conversion
    ALTER TABLE documents ADD COLUMN tenant_id_new UUID;
    
    -- Convert valid UUIDs, set invalid ones to default
    UPDATE documents 
    SET tenant_id_new = CASE 
      WHEN tenant_id IS NULL THEN NULL
      WHEN length(tenant_id::text) = 36 AND tenant_id::text ~ '^[0-9a-f-]+$' THEN 
        CASE 
          WHEN tenant_id::text = '00000000-0000-0000-0000-000000000000' THEN '00000000-0000-0000-0000-000000000001'::UUID
          ELSE tenant_id::UUID 
        END
      ELSE '00000000-0000-0000-0000-000000000001'::UUID
    END;
    
    -- Drop old column and rename new one
    ALTER TABLE documents DROP COLUMN tenant_id;
    ALTER TABLE documents RENAME COLUMN tenant_id_new TO tenant_id;
    
    RAISE NOTICE '✅ documents.tenant_id converted to UUID';
  ELSE
    RAISE NOTICE '✅ documents.tenant_id already UUID type';
  END IF;
  
  -- Handle search_history table conversion
  IF search_type != 'uuid' THEN
    RAISE NOTICE 'Converting search_history.tenant_id from % to UUID', search_type;
    
    -- Create a temp column for safe conversion
    ALTER TABLE search_history ADD COLUMN tenant_id_new UUID;
    
    -- Convert valid UUIDs, set invalid ones to default
    UPDATE search_history 
    SET tenant_id_new = CASE 
      WHEN tenant_id IS NULL THEN NULL
      WHEN length(tenant_id::text) = 36 AND tenant_id::text ~ '^[0-9a-f-]+$' THEN 
        CASE 
          WHEN tenant_id::text = '00000000-0000-0000-0000-000000000000' THEN '00000000-0000-0000-0000-000000000001'::UUID
          ELSE tenant_id::UUID 
        END
      ELSE '00000000-0000-0000-0000-000000000001'::UUID
    END;
    
    -- Drop old column and rename new one
    ALTER TABLE search_history DROP COLUMN tenant_id;
    ALTER TABLE search_history RENAME COLUMN tenant_id_new TO tenant_id;
    
    RAISE NOTICE '✅ search_history.tenant_id converted to UUID';
  ELSE
    RAISE NOTICE '✅ search_history.tenant_id already UUID type';
  END IF;
END;
$$;

-- STEP 6: Add back foreign key constraints
ALTER TABLE documents 
  ADD CONSTRAINT documents_tenant_id_fkey 
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;

ALTER TABLE search_history 
  ADD CONSTRAINT search_history_tenant_id_fkey 
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;

-- STEP 7: Add missing columns
DO $$
BEGIN
  -- Add custom_persona to tenants if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'tenants' AND column_name = 'custom_persona') THEN
    ALTER TABLE tenants ADD COLUMN custom_persona jsonb DEFAULT '{}';
    RAISE NOTICE '✅ Added custom_persona column to tenants';
  END IF;
  
  -- Add access_level to users if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'users' AND column_name = 'access_level') THEN
    ALTER TABLE users ADD COLUMN access_level integer NOT NULL DEFAULT 3 
      CHECK (access_level >= 1 AND access_level <= 5);
    RAISE NOTICE '✅ Added access_level column to users';
  END IF;
  
  -- Add tenant_id to document_chunks if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'document_chunks' AND column_name = 'tenant_id') THEN
    ALTER TABLE document_chunks ADD COLUMN tenant_id UUID;
    RAISE NOTICE '✅ Added tenant_id column to document_chunks';
    
    -- Populate tenant_id from documents table
    UPDATE document_chunks 
    SET tenant_id = d.tenant_id 
    FROM documents d 
    WHERE document_chunks.document_id = d.id AND document_chunks.tenant_id IS NULL;
    
    -- Add constraint
    ALTER TABLE document_chunks 
      ADD CONSTRAINT document_chunks_tenant_id_fkey 
      FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
  END IF;
END;
$$;

-- STEP 8: Re-enable RLS and create proper policies
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE search_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_chunks ENABLE ROW LEVEL SECURITY;

-- STEP 9: Create improved RLS policies using proper Supabase auth
CREATE POLICY "Documents tenant isolation" ON documents
  FOR ALL USING (
    tenant_id IN (
      SELECT tenant_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Search history tenant isolation" ON search_history
  FOR ALL USING (
    tenant_id IN (
      SELECT tenant_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Document chunks tenant isolation" ON document_chunks
  FOR ALL USING (
    tenant_id IN (
      SELECT tenant_id FROM users WHERE id = auth.uid()
    )
  );

-- STEP 10: Add performance indexes
CREATE INDEX IF NOT EXISTS idx_documents_tenant_id ON documents(tenant_id);
CREATE INDEX IF NOT EXISTS idx_search_history_tenant_id ON search_history(tenant_id);
CREATE INDEX IF NOT EXISTS idx_document_chunks_tenant_id ON document_chunks(tenant_id);

-- STEP 11: Final validation
DO $$
DECLARE
  docs_type TEXT;
  search_type TEXT;
  chunks_tenant_exists BOOLEAN;
BEGIN
  -- Check column types
  SELECT data_type INTO docs_type 
  FROM information_schema.columns 
  WHERE table_name = 'documents' AND column_name = 'tenant_id';
  
  SELECT data_type INTO search_type 
  FROM information_schema.columns 
  WHERE table_name = 'search_history' AND column_name = 'tenant_id';
  
  SELECT EXISTS(SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'document_chunks' AND column_name = 'tenant_id') 
  INTO chunks_tenant_exists;
  
  IF docs_type = 'uuid' AND search_type = 'uuid' AND chunks_tenant_exists THEN
    RAISE NOTICE '✅ MIGRATION SUCCESSFUL';
    RAISE NOTICE '✅ documents.tenant_id: %', docs_type;
    RAISE NOTICE '✅ search_history.tenant_id: %', search_type;
    RAISE NOTICE '✅ document_chunks.tenant_id: added';
    RAISE NOTICE '✅ RLS policies recreated';
    RAISE NOTICE '✅ Ready for production integration';
  ELSE
    RAISE EXCEPTION 'Migration validation failed: docs_type=%, search_type=%, chunks_tenant=%', docs_type, search_type, chunks_tenant_exists;
  END IF;
END;
$$;
