-- ============================================================================
-- DIAGNOSTIC: Find chunks that need embeddings regenerated
-- ============================================================================
-- Run this AFTER fixing the embedding column type
-- This identifies which chunks need embeddings regenerated
-- ============================================================================

-- 1. Check overall embedding status
SELECT 
  dc.tenant_id,
  t.name as tenant_name,
  COUNT(*) as total_chunks,
  COUNT(dc.embedding) as chunks_with_embeddings,
  COUNT(*) - COUNT(dc.embedding) as chunks_missing_embeddings,
  ROUND(100.0 * COUNT(dc.embedding) / NULLIF(COUNT(*), 0), 1) as embedding_percentage
FROM document_chunks dc
JOIN tenants t ON dc.tenant_id = t.id
GROUP BY dc.tenant_id, t.name
ORDER BY chunks_missing_embeddings DESC;

-- 2. List documents with missing embeddings for sculptai
SELECT 
  d.id as document_id,
  d.filename,
  d.processing_status,
  COUNT(dc.id) as total_chunks,
  COUNT(dc.embedding) as chunks_with_embeddings,
  COUNT(*) - COUNT(dc.embedding) as chunks_missing
FROM documents d
JOIN document_chunks dc ON d.id = dc.document_id
WHERE d.tenant_id = 'b89b8fab-0a25-4266-a4d0-306cc4d358cb'
GROUP BY d.id, d.filename, d.processing_status
HAVING COUNT(dc.embedding) < COUNT(*)
ORDER BY chunks_missing DESC;

-- 3. Sample chunk content (to verify chunks exist)
SELECT 
  id,
  document_id,
  chunk_index,
  LEFT(content, 100) || '...' as content_preview,
  CASE 
    WHEN embedding IS NULL THEN '❌ NO EMBEDDING'
    ELSE '✅ HAS EMBEDDING'
  END as embedding_status
FROM document_chunks
WHERE tenant_id = 'b89b8fab-0a25-4266-a4d0-306cc4d358cb'
ORDER BY created_at DESC
LIMIT 10;

-- 4. Count by document processing status
SELECT 
  d.processing_status,
  COUNT(DISTINCT d.id) as document_count,
  COUNT(dc.id) as total_chunks,
  COUNT(dc.embedding) as chunks_with_embeddings
FROM documents d
LEFT JOIN document_chunks dc ON d.id = dc.document_id
WHERE d.tenant_id = 'b89b8fab-0a25-4266-a4d0-306cc4d358cb'
GROUP BY d.processing_status
ORDER BY d.processing_status;

-- ============================================================================
-- ACTION REQUIRED:
-- ============================================================================
-- If chunks are missing embeddings, you need to:
--
-- OPTION A: Re-upload documents (recommended for small number of documents)
--   - Delete documents via UI
--   - Re-upload them
--   - System will generate embeddings automatically
--
-- OPTION B: Trigger embedding generation via API (for many documents)
--   - Create an API endpoint to regenerate embeddings for existing chunks
--   - Use Google text-embedding-004 model
--   - Update document_chunks.embedding column
--
-- OPTION C: Run manual embedding generation (if you have the chunks)
--   - Export chunks to JSON
--   - Generate embeddings using text-embedding-004
--   - Update database with embeddings
-- ============================================================================

