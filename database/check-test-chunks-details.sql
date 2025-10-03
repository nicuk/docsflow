-- Deep dive into TEST.docx processing

-- 1. Get the document ID and details
WITH test_doc AS (
  SELECT id, filename, created_at
  FROM documents
  WHERE filename ILIKE '%TEST%'
  ORDER BY created_at DESC
  LIMIT 1
)
SELECT 
  'Document ID: ' || id::text as info,
  'Created: ' || created_at::text as time_info,
  'Age: ' || EXTRACT(EPOCH FROM (NOW() - created_at))::int || ' seconds' as age
FROM test_doc;

-- 2. Check if ANY chunks exist for this document
SELECT 
  d.id as document_id,
  d.filename,
  COUNT(dc.id) as total_chunks,
  COUNT(CASE WHEN dc.embedding IS NOT NULL THEN 1 END) as chunks_with_embeddings
FROM documents d
LEFT JOIN document_chunks dc ON d.id = dc.document_id
WHERE d.filename ILIKE '%TEST%'
GROUP BY d.id, d.filename
ORDER BY d.created_at DESC
LIMIT 1;

-- 3. If chunks exist, show them
SELECT 
  dc.id,
  dc.chunk_index,
  dc.tenant_id,
  SUBSTRING(dc.content, 1, 100) as content_start,
  LENGTH(dc.content) as content_length,
  CASE WHEN dc.embedding IS NOT NULL THEN 'YES' ELSE 'NO' END as has_embedding,
  dc.created_at
FROM documents d
JOIN document_chunks dc ON d.id = dc.document_id
WHERE d.filename ILIKE '%TEST%'
ORDER BY dc.chunk_index
LIMIT 10;

