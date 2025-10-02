-- Fix the similarity_search function to properly handle tenant_id comparison
-- The issue was comparing UUID with ::text cast which caused operator precedence issues

DROP FUNCTION IF EXISTS similarity_search(vector(768), float, int, text, int);

CREATE OR REPLACE FUNCTION similarity_search(
  query_embedding vector(768),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 5,
  tenant_id text DEFAULT NULL,
  access_level int DEFAULT 1
)
RETURNS TABLE (
  id uuid,
  content text,
  similarity float,
  document_id uuid,
  chunk_index int
)
LANGUAGE sql STABLE
AS $$
  SELECT
    dc.id,
    dc.content,
    1 - (dc.embedding <=> query_embedding) as similarity,
    dc.document_id,
    dc.chunk_index
  FROM document_chunks as dc
  JOIN documents d ON d.id = dc.document_id
  JOIN tenants t ON d.tenant_id = t.id
  WHERE 
    (similarity_search.tenant_id IS NULL OR CAST(t.id AS text) = similarity_search.tenant_id)
    AND t.access_level <= similarity_search.access_level
    AND 1 - (dc.embedding <=> query_embedding) > match_threshold
  ORDER BY dc.embedding <=> query_embedding
  LIMIT match_count;
$$;

