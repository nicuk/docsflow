-- Fix: Change vector search functions from STABLE to VOLATILE
-- This resolves the "SET is not allowed in a non-volatile function" error

-- Fix similarity_search_optimized function
CREATE OR REPLACE FUNCTION similarity_search_optimized(
  query_embedding vector(768),
  tenant_filter uuid DEFAULT NULL,
  access_level_filter int DEFAULT 5,
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 20
)
RETURNS TABLE (
  id uuid,
  content text,
  similarity float,
  document_id uuid,
  chunk_index int,
  metadata jsonb,
  access_level int
)
LANGUAGE plpgsql VOLATILE -- Changed from STABLE to VOLATILE
AS $$
BEGIN
  -- Set HNSW search parameters
  SET LOCAL hnsw.ef = 100;
  
  RETURN QUERY
  SELECT
    dc.id,
    dc.content,
    1 - (dc.embedding <=> query_embedding) as similarity,
    dc.document_id,
    dc.chunk_index,
    dc.metadata,
    dc.access_level
  FROM document_chunks dc
  WHERE 
    -- Direct column filtering instead of JSONB
    (tenant_filter IS NULL OR dc.tenant_id = tenant_filter)
    AND dc.access_level <= access_level_filter
    AND 1 - (dc.embedding <=> query_embedding) > match_threshold
  ORDER BY dc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Fix hybrid_search_optimized function
CREATE OR REPLACE FUNCTION hybrid_search_optimized(
  query_embedding vector(768),
  query_text text,
  tenant_filter uuid DEFAULT NULL,
  access_level_filter int DEFAULT 5,
  vector_weight float DEFAULT 0.7,
  keyword_weight float DEFAULT 0.3,
  match_count int DEFAULT 20
)
RETURNS TABLE (
  id uuid,
  content text,
  document_id uuid,
  chunk_index int,
  vector_similarity float,
  text_rank float,
  combined_score float,
  metadata jsonb
)
LANGUAGE plpgsql VOLATILE -- Changed from STABLE to VOLATILE
AS $$
BEGIN
  -- Optimize HNSW for this query
  SET LOCAL hnsw.ef = 100;
  
  RETURN QUERY
  WITH vector_results AS (
    SELECT
      dc.id,
      dc.content,
      dc.document_id,
      dc.chunk_index,
      1 - (dc.embedding <=> query_embedding) as similarity,
      dc.metadata
    FROM document_chunks dc
    WHERE 
      (tenant_filter IS NULL OR dc.tenant_id = tenant_filter)
      AND dc.access_level <= access_level_filter
      AND dc.embedding IS NOT NULL
    ORDER BY dc.embedding <=> query_embedding
    LIMIT match_count * 2
  ),
  text_results AS (
    SELECT
      dc.id,
      dc.content,
      dc.document_id,
      dc.chunk_index,
      ts_rank_cd(dc.search_vector, websearch_to_tsquery('english', query_text)) as rank,
      dc.metadata
    FROM document_chunks dc
    WHERE 
      (tenant_filter IS NULL OR dc.tenant_id = tenant_filter)
      AND dc.access_level <= access_level_filter
      AND dc.search_vector @@ websearch_to_tsquery('english', query_text)
    ORDER BY rank DESC
    LIMIT match_count * 2
  )
  SELECT DISTINCT ON (COALESCE(v.id, t.id))
    COALESCE(v.id, t.id) as id,
    COALESCE(v.content, t.content) as content,
    COALESCE(v.document_id, t.document_id) as document_id,
    COALESCE(v.chunk_index, t.chunk_index) as chunk_index,
    COALESCE(v.similarity, 0)::float as vector_similarity,
    COALESCE(t.rank, 0)::float as text_rank,
    (COALESCE(v.similarity, 0) * vector_weight + 
     COALESCE(t.rank, 0) * keyword_weight)::float as combined_score,
    COALESCE(v.metadata, t.metadata) as metadata
  FROM vector_results v
  FULL OUTER JOIN text_results t ON v.id = t.id
  ORDER BY COALESCE(v.id, t.id), combined_score DESC
  LIMIT match_count;
END;
$$;

-- Also check if there are any other functions that might have the same issue
-- This query will help identify functions that use SET but are not VOLATILE
DO $$
BEGIN
  RAISE NOTICE 'Migration complete. Functions changed from STABLE to VOLATILE to allow SET LOCAL commands.';
  RAISE NOTICE 'Run this migration in Supabase SQL Editor to fix the vector search errors.';
END $$;
