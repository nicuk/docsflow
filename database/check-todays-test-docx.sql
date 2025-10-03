-- Find TEST.docx uploaded TODAY (Oct 2, 2025)

-- 1. Find the exact document
SELECT 
  id,
  filename,
  processing_status,
  created_at,
  updated_at,
  error_message
FROM documents
WHERE filename = 'TEST.docx'
  AND created_at > '2025-10-02'::date
ORDER BY created_at DESC;

-- 2. Check for chunks for TODAY's TEST.docx
WITH todays_test AS (
  SELECT id
  FROM documents
  WHERE filename = 'TEST.docx'
    AND created_at > '2025-10-02'::date
  ORDER BY created_at DESC
  LIMIT 1
)
SELECT 
  dc.id,
  dc.chunk_index,
  SUBSTRING(dc.content, 1, 150) as content_preview,
  LENGTH(dc.content) as content_length,
  CASE WHEN dc.embedding IS NOT NULL THEN 'YES ✅' ELSE 'NO ❌' END as has_embedding,
  dc.created_at
FROM todays_test t
LEFT JOIN document_chunks dc ON t.id = dc.document_id
ORDER BY dc.chunk_index;

-- 3. If no chunks, show this
SELECT 
  CASE 
    WHEN NOT EXISTS (
      SELECT 1 FROM documents WHERE filename = 'TEST.docx' AND created_at > '2025-10-02'::date
    ) THEN '❌ No TEST.docx found uploaded today'
    WHEN NOT EXISTS (
      SELECT 1 FROM document_chunks dc
      JOIN documents d ON d.id = dc.document_id
      WHERE d.filename = 'TEST.docx' AND d.created_at > '2025-10-02'::date
    ) THEN '⚠️ Document exists but NO CHUNKS created - processing failed to start'
    ELSE '✅ Chunks found'
  END as diagnosis;

