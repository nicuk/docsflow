-- Check if TEST.docx is being processed successfully

-- 1. Document status
SELECT 
  id,
  filename,
  processing_status,
  created_at,
  updated_at,
  error_message,
  EXTRACT(EPOCH FROM (NOW() - created_at)) as seconds_since_upload
FROM documents 
WHERE filename ILIKE '%TEST%'
ORDER BY created_at DESC
LIMIT 1;

-- 2. Check if chunks were created
SELECT 
  d.filename,
  COUNT(dc.id) as total_chunks,
  COUNT(CASE WHEN dc.embedding IS NOT NULL THEN 1 END) as chunks_with_embeddings,
  MIN(dc.created_at) as first_chunk_created,
  MAX(dc.created_at) as last_chunk_created
FROM documents d
LEFT JOIN document_chunks dc ON d.id = dc.document_id
WHERE d.filename ILIKE '%TEST%'
GROUP BY d.filename, d.id
ORDER BY d.created_at DESC;

-- 3. Sample chunk content (first chunk)
SELECT 
  d.filename,
  dc.chunk_index,
  SUBSTRING(dc.content, 1, 200) as content_preview,
  CASE WHEN dc.embedding IS NOT NULL THEN '✅ Has embedding' ELSE '❌ No embedding' END as embedding_status,
  dc.created_at
FROM documents d
JOIN document_chunks dc ON d.id = dc.document_id
WHERE d.filename ILIKE '%TEST%'
ORDER BY dc.chunk_index
LIMIT 3;

-- 4. Test if we can search for it
DO $$
DECLARE
  test_result RECORD;
  test_embedding vector(768);
BEGIN
  -- Create a dummy embedding for search test
  test_embedding := array_fill(0, ARRAY[768])::vector(768);
  
  -- Try to find TEST.docx in search
  SELECT COUNT(*) as found_in_search INTO test_result
  FROM similarity_search(test_embedding, 0.0, 100)
  WHERE filename ILIKE '%TEST%';
  
  RAISE NOTICE '✅ TEST.docx found in search results: % chunks', test_result;
END $$;

-- 5. Check processing time
SELECT 
  filename,
  processing_status,
  created_at,
  updated_at,
  EXTRACT(EPOCH FROM (updated_at - created_at)) as processing_time_seconds,
  CASE 
    WHEN processing_status = 'completed' THEN '✅ Complete'
    WHEN processing_status = 'processing' AND EXTRACT(EPOCH FROM (NOW() - created_at)) > 120 THEN '⚠️ Stuck (>2 min)'
    WHEN processing_status = 'processing' THEN '⏳ Still processing'
    WHEN processing_status = 'error' THEN '❌ Error'
    ELSE '❓ Unknown'
  END as status_emoji
FROM documents
WHERE filename ILIKE '%TEST%'
ORDER BY created_at DESC
LIMIT 1;

