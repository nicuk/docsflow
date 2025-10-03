-- Test if similarity_search ACTUALLY returns filename when called
-- This simulates what the application does

-- Create a test embedding (all zeros)
WITH test_embedding AS (
  SELECT array_fill(0, ARRAY[768])::vector(768) as embedding
)
SELECT 
  id,
  document_id,
  filename,  -- ← Does this field exist in the result?
  content,
  similarity,
  chunk_index,
  tenant_id,
  document_category,
  chunk_metadata,
  document_metadata
FROM similarity_search(
  (SELECT embedding FROM test_embedding),
  0.0,  -- Match threshold (0.0 = return everything)
  10,   -- Limit
  NULL, -- Tenant filter (NULL = all tenants)
  5     -- Access level
)
LIMIT 5;

