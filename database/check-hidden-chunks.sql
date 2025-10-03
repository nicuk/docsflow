-- Check for hidden/orphaned chunks that don't show in normal queries
-- Run this to find chunks that might be causing the 1360kB storage usage

-- 1. Check total chunks with tenant filter
SELECT 
  'With tenant filter' as query_type,
  COUNT(*) as chunk_count,
  pg_size_pretty(pg_total_relation_size('document_chunks')) as table_size
FROM document_chunks 
WHERE tenant_id = 'b89b8fab-0a25-4266-a4d0-306cc4d358cb';

-- 2. Check ALL chunks (no tenant filter) 
SELECT 
  'Without tenant filter' as query_type,
  COUNT(*) as chunk_count,
  COUNT(DISTINCT tenant_id) as unique_tenants,
  pg_size_pretty(pg_total_relation_size('document_chunks')) as table_size
FROM document_chunks;

-- 3. Check chunks by tenant to see if there are other tenants
SELECT 
  tenant_id,
  COUNT(*) as chunk_count,
  COUNT(DISTINCT document_id) as unique_documents,
  MIN(created_at) as oldest_chunk,
  MAX(created_at) as newest_chunk
FROM document_chunks 
GROUP BY tenant_id
ORDER BY chunk_count DESC;

-- 4. Check for chunks with NULL tenant_id
SELECT 
  'NULL tenant_id chunks' as issue_type,
  COUNT(*) as chunk_count,
  COUNT(DISTINCT document_id) as unique_documents
FROM document_chunks 
WHERE tenant_id IS NULL;

-- 5. Check for orphaned chunks (document_id doesn't exist in documents table)
SELECT 
  'Orphaned chunks' as issue_type,
  COUNT(*) as chunk_count,
  COUNT(DISTINCT dc.document_id) as unique_document_ids
FROM document_chunks dc
LEFT JOIN documents d ON dc.document_id = d.id
WHERE d.id IS NULL;

-- 6. Check storage details
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as total_size,
  pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) as table_size,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) - pg_relation_size(schemaname||'.'||tablename)) as index_size
FROM pg_tables 
WHERE tablename = 'document_chunks';
