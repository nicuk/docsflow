-- Diagnostic: Check Recent Uploads and Their Embeddings
-- Purpose: Verify if new uploads are using clean embeddings

-- 1. Recent documents (last hour)
SELECT 
  id,
  filename,
  created_at,
  tenant_id
FROM documents
WHERE created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC
LIMIT 10;

-- 2. Check chunks from recent documents
SELECT 
  dc.id,
  dc.document_id,
  dc.chunk_index,
  dc.created_at,
  LENGTH(dc.content) as content_length,
  dc.metadata->>'context_summary' as has_summary,
  dc.metadata->>'contextual_content' as has_contextual_content,
  SUBSTRING(dc.content, 1, 100) as content_preview
FROM document_chunks dc
JOIN documents d ON dc.document_id = d.id
WHERE d.created_at > NOW() - INTERVAL '1 hour'
ORDER BY dc.created_at DESC
LIMIT 20;

-- 3. Check if embeddings exist for recent chunks
SELECT 
  dc.id,
  dc.document_id,
  d.filename,
  CASE 
    WHEN dc.embedding IS NOT NULL THEN 'Has embedding'
    ELSE 'NO EMBEDDING'
  END as embedding_status,
  dc.metadata->>'enhanced_chunking' as is_enhanced,
  SUBSTRING(dc.content, 1, 80) as content_start
FROM document_chunks dc
JOIN documents d ON dc.document_id = d.id
WHERE d.created_at > NOW() - INTERVAL '1 hour'
ORDER BY dc.created_at DESC
LIMIT 10;

-- 4. Search for "SEO" keyword in recent uploads
SELECT 
  dc.id,
  d.filename,
  dc.content,
  dc.created_at
FROM document_chunks dc
JOIN documents d ON dc.document_id = d.id
WHERE 
  d.created_at > NOW() - INTERVAL '1 hour'
  AND (
    dc.content ILIKE '%SEO%' 
    OR dc.content ILIKE '%AI-Search%'
    OR dc.content ILIKE '%Executive Brief%'
  )
LIMIT 5;

-- 5. Check what "Unknown" documents exist (the ones showing in results)
SELECT 
  d.id,
  d.filename,
  d.created_at,
  COUNT(dc.id) as chunk_count
FROM documents d
LEFT JOIN document_chunks dc ON d.id = dc.document_id
WHERE d.filename ILIKE '%unknown%' OR d.filename IS NULL
GROUP BY d.id, d.filename, d.created_at
ORDER BY d.created_at DESC
LIMIT 10;

