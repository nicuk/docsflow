-- ========================================
-- DIAGNOSE: Why Raspberry doc not found
-- ========================================

-- 1. Check if Raspberry document exists and is completed
SELECT 
  id,
  filename,
  tenant_id,
  processing_status,
  created_at
FROM documents
WHERE filename ILIKE '%raspberry%'
ORDER BY created_at DESC;

-- 2. Check if Raspberry chunks exist with embeddings
SELECT 
  dc.id,
  dc.document_id,
  dc.metadata->>'filename' as chunk_filename,
  LENGTH(dc.content) as content_length,
  CASE 
    WHEN dc.embedding IS NULL THEN '❌ NO EMBEDDING'
    WHEN pg_typeof(dc.embedding)::text = 'vector' THEN '✅ HAS EMBEDDING (vector type)'
    ELSE '⚠️ WRONG TYPE: ' || pg_typeof(dc.embedding)::text
  END as embedding_status,
  LEFT(dc.content, 100) as content_preview
FROM document_chunks dc
JOIN documents d ON dc.document_id = d.id
WHERE d.filename ILIKE '%raspberry%'
ORDER BY dc.created_at DESC;

-- 3. Count all documents by status
SELECT 
  processing_status,
  COUNT(*) as doc_count,
  COUNT(DISTINCT tenant_id) as tenant_count
FROM documents
WHERE tenant_id = 'b89b8fab-0a25-4266-a4d0-306cc4d358cb'
GROUP BY processing_status;

-- 4. Check for chunks WITHOUT filenames in metadata
SELECT 
  COUNT(*) as chunks_without_filename,
  COUNT(*) FILTER (WHERE embedding IS NOT NULL) as with_embedding,
  COUNT(*) FILTER (WHERE embedding IS NULL) as without_embedding
FROM document_chunks
WHERE 
  tenant_id = 'b89b8fab-0a25-4266-a4d0-306cc4d358cb'
  AND (metadata->>'filename' IS NULL OR metadata->>'filename' = '');

-- 5. Test vector search for "raspberry" keyword
SELECT 
  dc.id,
  d.filename,
  dc.metadata->>'filename' as chunk_filename,
  LEFT(dc.content, 150) as snippet,
  CASE 
    WHEN dc.embedding IS NULL THEN 0
    ELSE 1
  END as has_embedding
FROM document_chunks dc
JOIN documents d ON dc.document_id = d.id
WHERE 
  dc.tenant_id = 'b89b8fab-0a25-4266-a4d0-306cc4d358cb'
  AND (
    dc.content ILIKE '%raspberry%' 
    OR dc.metadata->>'filename' ILIKE '%raspberry%'
    OR d.filename ILIKE '%raspberry%'
  )
LIMIT 10;

