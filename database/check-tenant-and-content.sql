-- Check which tenant these images belong to
SELECT 
  d.id,
  d.filename,
  d.tenant_id,
  t.subdomain as tenant_name,
  d.created_at,
  d.document_category
FROM documents d
JOIN tenants t ON d.tenant_id = t.id
WHERE d.filename IN ('image_720 (1).png', 'image (18).png', 'Part A - SEO Framework.pdf')
ORDER BY d.created_at DESC;

-- Check the actual embeddings - do they differ?
SELECT 
  d.filename,
  dc.chunk_index,
  SUBSTRING(dc.content, 1, 200) as content_preview,
  -- Check if embedding exists
  CASE WHEN dc.embedding IS NOT NULL THEN '✅ Has embedding' ELSE '❌ No embedding' END as embedding_status
FROM documents d
JOIN document_chunks dc ON d.id = dc.document_id
WHERE d.filename IN ('image_720 (1).png', 'image (18).png')
  AND d.created_at > NOW() - INTERVAL '1 hour'
ORDER BY d.filename, dc.chunk_index;

