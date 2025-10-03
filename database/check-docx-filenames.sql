-- Check if DOCX filenames are stored correctly in the database
SELECT 
  d.id,
  d.filename,
  d.mime_type,
  d.created_at,
  COUNT(dc.id) as chunk_count
FROM documents d
LEFT JOIN document_chunks dc ON d.id = dc.document_id
WHERE d.created_at > NOW() - INTERVAL '1 hour'
  AND d.mime_type LIKE '%wordprocessingml%'  -- DOCX mime type
GROUP BY d.id, d.filename, d.mime_type, d.created_at
ORDER BY d.created_at DESC;

-- Check what metadata is in the chunks for DOCX files
SELECT 
  d.filename as document_filename,
  dc.chunk_index,
  dc.metadata->>'filename' as chunk_metadata_filename,
  dc.metadata as full_metadata
FROM documents d
JOIN document_chunks dc ON d.id = dc.document_id
WHERE d.created_at > NOW() - INTERVAL '1 hour'
  AND d.mime_type LIKE '%wordprocessingml%'
ORDER BY d.filename, dc.chunk_index
LIMIT 5;

