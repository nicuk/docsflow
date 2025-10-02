-- ============================================================================
-- PRE-MIGRATION ANALYSIS: Tenant Join Fix
-- Run this BEFORE applying 20250102000003_fix_similarity_search_tenant_join.sql
-- ============================================================================

-- 1. Check current similarity_search function definition
SELECT 
  'similarity_search function' as check_item,
  pg_get_functiondef(oid) as current_definition
FROM pg_proc
WHERE proname = 'similarity_search'
  AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

-- 2. Verify column types for tenant_id across tables
SELECT 
  table_name,
  column_name,
  data_type,
  udt_name
FROM information_schema.columns
WHERE column_name = 'tenant_id'
  AND table_schema = 'public'
ORDER BY table_name;

-- 3. Check documents.tenant_id type specifically
SELECT 
  'documents.tenant_id type' as check_item,
  CASE 
    WHEN data_type = 'uuid' THEN '✅ UUID (correct)'
    WHEN data_type = 'text' THEN '⚠️ TEXT (needs attention)'
    WHEN udt_name = 'uuid' THEN '✅ UUID via user-defined (correct)'
    ELSE '❌ UNEXPECTED: ' || data_type || ' / ' || udt_name
  END as status,
  data_type,
  udt_name
FROM information_schema.columns
WHERE table_name = 'documents'
  AND column_name = 'tenant_id'
  AND table_schema = 'public';

-- 4. Check document_chunks.tenant_id type
SELECT 
  'document_chunks.tenant_id type' as check_item,
  CASE 
    WHEN data_type = 'uuid' THEN '✅ UUID (correct)'
    WHEN data_type = 'text' THEN '⚠️ TEXT (may need migration)'
    WHEN udt_name = 'uuid' THEN '✅ UUID via user-defined (correct)'
    ELSE '❌ UNEXPECTED: ' || data_type || ' / ' || udt_name
  END as status,
  data_type,
  udt_name
FROM information_schema.columns
WHERE table_name = 'document_chunks'
  AND column_name = 'tenant_id'
  AND table_schema = 'public';

-- 5. Check tenants.id type
SELECT 
  'tenants.id type' as check_item,
  CASE 
    WHEN data_type = 'uuid' THEN '✅ UUID (correct)'
    ELSE '❌ UNEXPECTED: ' || data_type
  END as status,
  data_type,
  udt_name
FROM information_schema.columns
WHERE table_name = 'tenants'
  AND column_name = 'id'
  AND table_schema = 'public';

-- 6. Check foreign key relationships
SELECT 
  'FK: documents → tenants' as relationship,
  tc.constraint_name,
  kcu.column_name as fk_column,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name = 'documents'
  AND kcu.column_name = 'tenant_id';

-- 7. Sample data check - verify relationships work
SELECT 
  'Sample tenant → documents relationship' as check_item,
  COUNT(DISTINCT t.id) as tenant_count,
  COUNT(DISTINCT d.id) as document_count,
  COUNT(DISTINCT dc.id) as chunk_count
FROM tenants t
LEFT JOIN documents d ON d.tenant_id = t.id
LEFT JOIN document_chunks dc ON dc.document_id = d.id;

-- 8. Check for sculptai tenant specifically
SELECT 
  'sculptai tenant analysis' as check_item,
  t.id as tenant_id,
  t.subdomain,
  COUNT(DISTINCT d.id) as document_count,
  COUNT(DISTINCT dc.id) as chunk_count,
  COUNT(DISTINCT dc.id) FILTER (WHERE dc.embedding IS NOT NULL) as chunks_with_embeddings
FROM tenants t
LEFT JOIN documents d ON d.tenant_id = t.id
LEFT JOIN document_chunks dc ON dc.document_id = d.id
WHERE t.subdomain = 'sculptai'
GROUP BY t.id, t.subdomain;

-- 9. Check if there are any tenant_id mismatches between documents and document_chunks
SELECT 
  'Tenant ID consistency check' as check_item,
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ All chunks have consistent tenant_id with parent document'
    ELSE '⚠️ Found ' || COUNT(*) || ' chunks with mismatched tenant_id'
  END as status,
  COUNT(*) as mismatch_count
FROM document_chunks dc
JOIN documents d ON dc.document_id = d.id
WHERE dc.tenant_id IS NOT NULL 
  AND d.tenant_id IS NOT NULL
  AND dc.tenant_id != d.tenant_id;

-- 10. Test query that would fail with current schema
-- This simulates what the similarity_search function tries to do
WITH test_tenant AS (
  SELECT id, subdomain FROM tenants WHERE subdomain = 'sculptai' LIMIT 1
)
SELECT 
  'Test join simulation' as check_item,
  CASE 
    WHEN COUNT(*) > 0 THEN '✅ Join works: ' || COUNT(*) || ' documents found'
    ELSE '⚠️ Join returns no results'
  END as status,
  COUNT(*) as document_count
FROM test_tenant t
JOIN documents d ON d.tenant_id = t.id
JOIN document_chunks dc ON dc.document_id = d.id
LIMIT 1;

-- 11. Check for any NULL tenant_id values
SELECT 
  'NULL tenant_id check' as check_item,
  'documents' as table_name,
  COUNT(*) FILTER (WHERE tenant_id IS NULL) as null_count,
  COUNT(*) as total_count,
  CASE 
    WHEN COUNT(*) FILTER (WHERE tenant_id IS NULL) = 0 THEN '✅ No NULL values'
    ELSE '⚠️ Found ' || COUNT(*) FILTER (WHERE tenant_id IS NULL) || ' NULL values'
  END as status
FROM documents
UNION ALL
SELECT 
  'NULL tenant_id check' as check_item,
  'document_chunks' as table_name,
  COUNT(*) FILTER (WHERE tenant_id IS NULL) as null_count,
  COUNT(*) as total_count,
  CASE 
    WHEN COUNT(*) FILTER (WHERE tenant_id IS NULL) = 0 THEN '✅ No NULL values'
    ELSE '⚠️ Found ' || COUNT(*) FILTER (WHERE tenant_id IS NULL) || ' NULL values'
  END as status
FROM document_chunks;

-- 12. Summary and recommendation
SELECT 
  '============================================' as separator
UNION ALL
SELECT 'ANALYSIS COMPLETE - Review results above'
UNION ALL
SELECT '============================================'
UNION ALL
SELECT 'Before running migration, verify:'
UNION ALL
SELECT '1. All tenant_id columns use UUID type'
UNION ALL
SELECT '2. Foreign key relationships exist'
UNION ALL
SELECT '3. No NULL tenant_id values in critical tables'
UNION ALL
SELECT '4. Join test works correctly'
UNION ALL
SELECT '============================================';

