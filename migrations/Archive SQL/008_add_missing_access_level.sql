-- ===============================================
-- CRITICAL FIX: Add Missing access_level Column
-- Resolves: Column "access_level" does not exist error
-- ===============================================

-- PHASE 1: Add access_level Column to Users Table
ALTER TABLE users ADD COLUMN IF NOT EXISTS access_level INTEGER NOT NULL DEFAULT 1;

-- PHASE 2: Add access_level Constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint pc
    JOIN pg_class c ON c.oid = pc.conrelid
    WHERE c.relname = 'users' AND pc.conname = 'users_access_level_check'
  ) THEN
    ALTER TABLE users ADD CONSTRAINT users_access_level_check 
      CHECK (access_level BETWEEN 1 AND 5);
  END IF;
  
  RAISE NOTICE '✅ ACCESS LEVEL: Column and constraint added to users table';
END $$;

-- PHASE 3: Set Default Access Levels Based on Role
UPDATE users SET access_level = CASE 
  WHEN role = 'admin' THEN 5
  WHEN role = 'user' THEN 3
  WHEN role = 'viewer' THEN 1
  ELSE 1
END
WHERE access_level = 1; -- Only update default values

-- PHASE 4: Add Missing tenant_id Column to document_chunks (if needed)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' 
    AND table_name = 'document_chunks'
    AND column_name = 'tenant_id'
  ) THEN
    ALTER TABLE document_chunks ADD COLUMN tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
    
    -- Populate tenant_id from documents table
    UPDATE document_chunks dc
    SET tenant_id = (
      SELECT CASE 
        WHEN d.tenant_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' 
        THEN d.tenant_id::UUID
        ELSE (SELECT id FROM tenants WHERE subdomain = d.tenant_id LIMIT 1)
      END
      FROM documents d 
      WHERE d.id = dc.document_id
    );
    
    RAISE NOTICE '✅ TENANT_ID: Added to document_chunks table';
  ELSE
    RAISE NOTICE '✅ TENANT_ID: Already exists in document_chunks';
  END IF;
END $$;

-- PHASE 5: Create Index for access_level
CREATE INDEX IF NOT EXISTS idx_users_access_level ON users(access_level);
CREATE INDEX IF NOT EXISTS idx_users_tenant_access ON users(tenant_id, access_level);

-- PHASE 6: Validate Critical Columns Exist
DO $$
DECLARE
  missing_columns TEXT[] := '{}';
BEGIN
  -- Check users.access_level
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'access_level'
  ) THEN
    missing_columns := missing_columns || 'users.access_level';
  END IF;
  
  -- Check document_chunks.tenant_id
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'document_chunks' AND column_name = 'tenant_id'
  ) THEN
    missing_columns := missing_columns || 'document_chunks.tenant_id';
  END IF;
  
  -- Check document_chunks.access_level
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'document_chunks' AND column_name = 'access_level'
  ) THEN
    missing_columns := missing_columns || 'document_chunks.access_level';
  END IF;
  
  IF array_length(missing_columns, 1) > 0 THEN
    RAISE WARNING 'Missing critical columns: %', array_to_string(missing_columns, ', ');
  ELSE
    RAISE NOTICE '✅ COLUMN VALIDATION: All critical columns exist';
  END IF;
END $$;

-- PHASE 7: Update Sample Data with Proper Access Levels
DO $$
BEGIN
  -- Ensure sample users have appropriate access levels
  UPDATE users SET access_level = 5 WHERE email LIKE 'admin@%' AND access_level < 5;
  UPDATE users SET access_level = 3 WHERE email LIKE 'tech@%' AND access_level < 3;
  
  RAISE NOTICE '✅ SAMPLE DATA: Updated user access levels';
END $$;

-- PHASE 8: Audit Log
INSERT INTO analytics_events (
  tenant_id, 
  event_type, 
  event_data,
  created_at
) 
SELECT 
  t.id,
  'missing_access_level_fix',
  jsonb_build_object(
    'migration', '008_add_missing_access_level',
    'issue_resolved', 'column_access_level_does_not_exist',
    'columns_added', ARRAY['users.access_level'],
    'constraints_added', ARRAY['users_access_level_check'],
    'status', 'CRITICAL_COLUMN_ADDED'
  ),
  NOW()
FROM tenants t;

-- ===============================================
-- MISSING ACCESS LEVEL FIX COMPLETE
-- Users table now has access_level column
-- Migration 006 can now be safely re-run
-- =============================================== 