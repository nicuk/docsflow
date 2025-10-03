-- Check ALL documents uploaded in the last hour
SELECT 
  d.id,
  d.filename,
  d.mime_type,
  d.created_at,
  COUNT(dc.id) as chunk_count
FROM documents d
LEFT JOIN document_chunks dc ON d.id = dc.document_id
WHERE d.created_at > NOW() - INTERVAL '1 hour'
GROUP BY d.id, d.filename, d.mime_type, d.created_at
ORDER BY d.created_at DESC;

-- Check the ACTUAL content of all recent chunks
SELECT 
  d.filename,
  dc.chunk_index,
  dc.created_at,
  -- Check if content starts with LLM summary pollution
  CASE 
    WHEN dc.content ILIKE 'This spreadsheet%' THEN '❌ POLLUTED - Spreadsheet summary'
    WHEN dc.content ILIKE 'This document%' THEN '❌ POLLUTED - Document summary'
    WHEN dc.content ILIKE 'Here is a detailed analysis%' THEN '❌ POLLUTED - Image summary'
    ELSE '✅ CLEAN - Raw content'
  END as embedding_status,
  SUBSTRING(dc.content, 1, 150) as content_start,
  dc.metadata->>'context_summary' as has_summary
FROM document_chunks dc
JOIN documents d ON dc.document_id = d.id
WHERE d.created_at > NOW() - INTERVAL '1 hour'
ORDER BY dc.created_at DESC;

-- Check for "Unknown" filename patterns
SELECT 
  d.id,
  d.filename,
  d.mime_type,
  COUNT(dc.id) as chunks,
  MIN(dc.created_at) as first_chunk,
  MAX(dc.created_at) as last_chunk
FROM documents d
LEFT JOIN document_chunks dc ON d.id = dc.document_id
WHERE d.created_at > NOW() - INTERVAL '1 hour'
  AND (d.filename ILIKE '%unknown%' OR d.filename IS NULL OR d.filename = '')
GROUP BY d.id, d.filename, d.mime_type
ORDER BY d.created_at DESC;

-- Find chunks with the "bad" content you saw
SELECT 
  d.id,
  d.filename,
  d.created_at,
  SUBSTRING(dc.content, 1, 200) as content_preview
FROM documents d
JOIN document_chunks dc ON d.id = dc.document_id
WHERE d.created_at > NOW() - INTERVAL '1 hour'
  AND (
    dc.content ILIKE '%trading transformation programs%'
    OR dc.content ILIKE '%webpage or landing page%'
    OR dc.content ILIKE '%psychological profiles%'
    OR dc.content ILIKE '%detailed analysis of the image%'
  )
LIMIT 10;

