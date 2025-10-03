-- ============================================================================
-- SIMPLE SCHEMA CHECK - Run this first
-- ============================================================================

-- 1. List all tables in public schema
SELECT 'ALL TABLES' as check_type, table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;

-- 2. Show documents table structure
SELECT 'DOCUMENTS COLUMNS' as check_type, 
  column_name, 
  data_type, 
  udt_name,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'documents'
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- 3. Show tenants table structure
SELECT 'TENANTS COLUMNS' as check_type,
  column_name, 
  data_type, 
  udt_name,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'tenants'
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- 4. Show document_chunks table structure
SELECT 'DOCUMENT_CHUNKS COLUMNS' as check_type,
  column_name, 
  data_type, 
  udt_name,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'document_chunks'
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- 5. Check if similarity_search function exists
SELECT 'SIMILARITY_SEARCH FUNCTION' as check_type,
  proname as function_name,
  pronargs as num_args,
  proargnames as arg_names
FROM pg_proc
WHERE proname = 'similarity_search';

-- 6. Count records in each table
SELECT 'RECORD COUNTS' as check_type,
  'tenants' as table_name,
  COUNT(*) as count
FROM tenants
UNION ALL
SELECT 'RECORD COUNTS',
  'documents',
  COUNT(*)
FROM documents
UNION ALL
SELECT 'RECORD COUNTS',
  'document_chunks',
  COUNT(*)
FROM document_chunks;

-- 7. Sample tenant data
SELECT 'SAMPLE TENANTS' as check_type,
  id,
  subdomain,
  name
FROM tenants
LIMIT 5;

-- 8. Sample document data with tenant_id
SELECT 'SAMPLE DOCUMENTS' as check_type,
  id,
  tenant_id,
  filename,
  pg_typeof(tenant_id) as tenant_id_type
FROM documents
LIMIT 5;

