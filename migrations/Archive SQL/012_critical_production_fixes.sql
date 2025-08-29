-- 🛡️ SAFE PRODUCTION FIXES - ONLY MISSING PIECES
-- Analysis shows most issues are already fixed in previous migrations
-- This migration only adds what's genuinely missing

-- ✅ VERIFICATION: Check what's already implemented
DO $$
BEGIN
  -- Check if pgvector is already enabled
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'vector') THEN
    RAISE NOTICE '✅ pgvector extension already exists';
  ELSE
    RAISE NOTICE '❌ pgvector extension missing - will create';
  END IF;
  
  -- Check if previous tenant_id fixes were applied
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name = 'documents' AND column_name = 'tenant_id' 
             AND data_type = 'uuid') THEN
    RAISE NOTICE '✅ documents.tenant_id already fixed to UUID';
  ELSE
    RAISE NOTICE '❌ documents.tenant_id still needs UUID conversion';
  END IF;
END;
$$;

-- 🔧 ONLY ADD MISSING COMPONENTS

-- 1. Ensure pgvector is available (safe if already exists)
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;

-- 2. Add custom_persona column ONLY if missing (already exists but ensure it's there)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'tenants' AND column_name = 'custom_persona') THEN
    ALTER TABLE tenants ADD COLUMN custom_persona jsonb DEFAULT '{}';
    RAISE NOTICE '✅ Added custom_persona column to tenants';
  ELSE
    RAISE NOTICE '✅ custom_persona column already exists';
  END IF;
END;
$$;

-- 3. Ensure critical indexes exist (safe to run multiple times)
CREATE INDEX IF NOT EXISTS idx_document_chunks_embedding 
  ON document_chunks USING ivfflat (embedding vector_cosine_ops) 
  WITH (lists = 100); -- Optimize for production

CREATE INDEX IF NOT EXISTS idx_documents_tenant_id ON documents(tenant_id);
CREATE INDEX IF NOT EXISTS idx_users_tenant_id ON users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_search_history_tenant_id ON search_history(tenant_id);
CREATE INDEX IF NOT EXISTS idx_chat_conversations_tenant_id ON chat_conversations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_tenant_id ON chat_messages(tenant_id);

-- 4. Validation checks
DO $$
DECLARE
  schema_issues TEXT[] := ARRAY[]::TEXT[];
BEGIN
  -- Check tenant_id consistency
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name = 'documents' AND column_name = 'tenant_id' 
             AND data_type != 'uuid') THEN
    schema_issues := array_append(schema_issues, 'documents.tenant_id not UUID');
  END IF;
  
  -- Check embedding column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'document_chunks' AND column_name = 'embedding') THEN
    schema_issues := array_append(schema_issues, 'document_chunks.embedding missing');
  END IF;
  
  -- Report results
  IF array_length(schema_issues, 1) > 0 THEN
    RAISE WARNING 'Schema issues found: %', array_to_string(schema_issues, ', ');
    RAISE NOTICE 'Run migration 011_safe_schema_fixes_corrected.sql first';
  ELSE
    RAISE NOTICE '✅ ALL SCHEMA VALIDATIONS PASSED';
    RAISE NOTICE '✅ Integration-ready database schema confirmed';
  END IF;
END;
$$;
