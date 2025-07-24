-- ===============================================
-- CRITICAL FIX: PostgreSQL Constraint Syntax Issues
-- Resolves: IF NOT EXISTS constraint syntax errors
-- ===============================================

-- FIX 1: Tenant Constraints (Safe Addition)
DO $$
BEGIN
  -- Fix valid_subdomain constraint
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint pc
    JOIN pg_class c ON c.oid = pc.conrelid
    WHERE c.relname = 'tenants' AND pc.conname = 'valid_subdomain'
  ) THEN
    ALTER TABLE tenants ADD CONSTRAINT valid_subdomain 
      CHECK (subdomain ~ '^[a-z0-9][a-z0-9-]*[a-z0-9]$');
  END IF;
  
  -- Fix valid_theme constraint
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint pc
    JOIN pg_class c ON c.oid = pc.conrelid
    WHERE c.relname = 'tenants' AND pc.conname = 'valid_theme'
  ) THEN
    ALTER TABLE tenants ADD CONSTRAINT valid_theme 
      CHECK (jsonb_typeof(theme) = 'object');
  END IF;
  
  -- Fix valid_settings constraint
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint pc
    JOIN pg_class c ON c.oid = pc.conrelid
    WHERE c.relname = 'tenants' AND pc.conname = 'valid_settings'
  ) THEN
    ALTER TABLE tenants ADD CONSTRAINT valid_settings 
      CHECK (jsonb_typeof(settings) = 'object');
  END IF;
  
  RAISE NOTICE '✅ TENANT CONSTRAINTS: Applied safely';
END $$;

-- FIX 2: Document Constraints (Safe Addition)
DO $$
BEGIN
  -- Fix valid_filename constraint
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint pc
    JOIN pg_class c ON c.oid = pc.conrelid
    WHERE c.relname = 'documents' AND pc.conname = 'valid_filename'
  ) THEN
    ALTER TABLE documents ADD CONSTRAINT valid_filename 
      CHECK (length(filename) > 0);
  END IF;
  
  -- Fix valid_file_size constraint
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint pc
    JOIN pg_class c ON c.oid = pc.conrelid
    WHERE c.relname = 'documents' AND pc.conname = 'valid_file_size'
  ) THEN
    ALTER TABLE documents ADD CONSTRAINT valid_file_size 
      CHECK (file_size > 0);
  END IF;
  
  RAISE NOTICE '✅ DOCUMENT CONSTRAINTS: Applied safely';
END $$;

-- FIX 3: Document Chunks Constraints (Safe Addition)
DO $$
BEGIN
  -- Fix valid_chunk_content constraint
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint pc
    JOIN pg_class c ON c.oid = pc.conrelid
    WHERE c.relname = 'document_chunks' AND pc.conname = 'valid_chunk_content'
  ) THEN
    ALTER TABLE document_chunks ADD CONSTRAINT valid_chunk_content 
      CHECK (length(content) > 0);
  END IF;
  
  -- Fix valid_chunk_index constraint
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint pc
    JOIN pg_class c ON c.oid = pc.conrelid
    WHERE c.relname = 'document_chunks' AND pc.conname = 'valid_chunk_index'
  ) THEN
    ALTER TABLE document_chunks ADD CONSTRAINT valid_chunk_index 
      CHECK (chunk_index >= 0);
  END IF;
  
  -- Fix valid_confidence constraint
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint pc
    JOIN pg_class c ON c.oid = pc.conrelid
    WHERE c.relname = 'document_chunks' AND pc.conname = 'valid_confidence'
  ) THEN
    ALTER TABLE document_chunks ADD CONSTRAINT valid_confidence 
      CHECK (confidence_score BETWEEN 0 AND 1);
  END IF;
  
  RAISE NOTICE '✅ CHUNK CONSTRAINTS: Applied safely';
END $$;

-- FIX 4: Check for Other Constraint Issues
DO $$
DECLARE
  constraint_record RECORD;
  constraint_count INTEGER := 0;
BEGIN
  -- Count all check constraints we've added
  FOR constraint_record IN
    SELECT c.relname as table_name, pc.conname as constraint_name
    FROM pg_constraint pc
    JOIN pg_class c ON c.oid = pc.conrelid
    WHERE pc.contype = 'c' 
    AND c.relname IN ('tenants', 'documents', 'document_chunks')
    AND pc.conname IN (
      'valid_subdomain', 'valid_theme', 'valid_settings',
      'valid_filename', 'valid_file_size',
      'valid_chunk_content', 'valid_chunk_index', 'valid_confidence'
    )
  LOOP
    constraint_count := constraint_count + 1;
    RAISE NOTICE 'Constraint: %.% exists', constraint_record.table_name, constraint_record.constraint_name;
  END LOOP;
  
  RAISE NOTICE '✅ CONSTRAINT VALIDATION: % constraints successfully applied', constraint_count;
END $$;

-- FIX 5: Validate All Tables and Constraints
DO $$
DECLARE
  table_record RECORD;
  missing_constraints TEXT[] := '{}';
BEGIN
  -- Check for any missing critical constraints
  FOR table_record IN
    SELECT 
      t.table_name,
      CASE 
        WHEN t.table_name = 'tenants' THEN ARRAY['valid_subdomain', 'valid_theme', 'valid_settings']
        WHEN t.table_name = 'documents' THEN ARRAY['valid_filename', 'valid_file_size']
        WHEN t.table_name = 'document_chunks' THEN ARRAY['valid_chunk_content', 'valid_chunk_index', 'valid_confidence']
        ELSE ARRAY[]::TEXT[]
      END as expected_constraints
    FROM information_schema.tables t
    WHERE t.table_schema = 'public' 
    AND t.table_name IN ('tenants', 'documents', 'document_chunks')
  LOOP
    -- Check each expected constraint
    FOR i IN 1..array_length(table_record.expected_constraints, 1)
    LOOP
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint pc
        JOIN pg_class c ON c.oid = pc.conrelid
        WHERE c.relname = table_record.table_name 
        AND pc.conname = table_record.expected_constraints[i]
      ) THEN
        missing_constraints := missing_constraints || (table_record.table_name || '.' || table_record.expected_constraints[i]);
      END IF;
    END LOOP;
  END LOOP;
  
  IF array_length(missing_constraints, 1) > 0 THEN
    RAISE WARNING 'Missing constraints: %', array_to_string(missing_constraints, ', ');
  ELSE
    RAISE NOTICE '✅ ALL CONSTRAINTS: Successfully validated and applied';
  END IF;
END $$;

-- FIX 6: Audit Log
INSERT INTO analytics_events (
  tenant_id, 
  event_type, 
  event_data,
  created_at
) 
SELECT 
  t.id,
  'constraint_syntax_fix',
  jsonb_build_object(
    'migration', '007_fix_constraint_syntax',
    'issue_resolved', 'postgresql_constraint_if_not_exists_syntax',
    'constraints_fixed', ARRAY[
      'valid_subdomain', 'valid_theme', 'valid_settings',
      'valid_filename', 'valid_file_size',
      'valid_chunk_content', 'valid_chunk_index', 'valid_confidence'
    ],
    'status', 'SYNTAX_ERRORS_RESOLVED'
  ),
  NOW()
FROM tenants t;

-- ===============================================
-- CONSTRAINT SYNTAX FIX COMPLETE
-- All PostgreSQL constraint syntax issues resolved
-- Migration 006 can now be safely re-run
-- =============================================== 