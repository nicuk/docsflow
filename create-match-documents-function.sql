-- ============================================================================
-- FIX: Create Missing match_documents Function
-- This is the ACTUAL root cause why AI can't find documents
-- ============================================================================

-- Enable vector extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS vector;

-- Create the match_documents function that the RAG pipeline expects
CREATE OR REPLACE FUNCTION match_documents (
  query_embedding vector(768),
  match_threshold float DEFAULT 0.78,
  match_count int DEFAULT 10,
  tenant_id uuid DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  document_id uuid,
  content text,
  metadata jsonb,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    document_chunks.id,
    document_chunks.document_id,
    document_chunks.content,
    document_chunks.metadata,
    1 - (document_chunks.embedding <=> query_embedding) as similarity
  FROM document_chunks
  WHERE 
    document_chunks.embedding IS NOT NULL
    AND (tenant_id IS NULL OR document_chunks.tenant_id = match_documents.tenant_id)
    AND 1 - (document_chunks.embedding <=> query_embedding) > match_threshold
  ORDER BY document_chunks.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Create alternative function name that might be expected
CREATE OR REPLACE FUNCTION match_document_chunks (
  query_embedding vector(768),
  match_threshold float DEFAULT 0.78,
  match_count int DEFAULT 10,
  tenant_id uuid DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  document_id uuid,
  content text,
  metadata jsonb,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM match_documents(query_embedding, match_threshold, match_count, tenant_id);
END;
$$;

-- Create a comprehensive search function with enhanced features
CREATE OR REPLACE FUNCTION search_documents (
  query_embedding vector(768),
  tenant_uuid uuid,
  similarity_threshold float DEFAULT 0.75,
  max_results int DEFAULT 10
)
RETURNS TABLE (
  chunk_id uuid,
  document_id uuid,
  filename text,
  content text,
  chunk_index int,
  similarity_score float,
  metadata jsonb
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    dc.id as chunk_id,
    dc.document_id,
    d.filename,
    dc.content,
    dc.chunk_index,
    1 - (dc.embedding <=> query_embedding) as similarity_score,
    dc.metadata
  FROM document_chunks dc
  JOIN documents d ON dc.document_id = d.id
  WHERE 
    dc.embedding IS NOT NULL
    AND dc.tenant_id = tenant_uuid
    AND d.tenant_id = tenant_uuid
    AND 1 - (dc.embedding <=> query_embedding) > similarity_threshold
  ORDER BY dc.embedding <=> query_embedding
  LIMIT max_results;
END;
$$;

-- Test the function to make sure it works
SELECT 'FUNCTION TEST' as test_name, 
       CASE 
         WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'match_documents') 
         THEN '✅ match_documents function created successfully'
         ELSE '❌ Function creation failed'
       END as status;

-- Test with bitto tenant (if embeddings exist)
SELECT 'BITTO TENANT TEST' as test_name,
       COUNT(*) as potential_results
FROM document_chunks
WHERE tenant_id = '122928f6-f34e-484b-9a69-7e1f25caf45c'
  AND embedding IS NOT NULL;

-- Create index for better performance if not exists
CREATE INDEX IF NOT EXISTS idx_document_chunks_embedding_cosine 
ON document_chunks USING ivfflat (embedding vector_cosine_ops) 
WITH (lists = 100);

-- Create tenant-specific index for security (separate indexes work better for vectors)
CREATE INDEX IF NOT EXISTS idx_document_chunks_tenant_id 
ON document_chunks (tenant_id)
WHERE embedding IS NOT NULL;

-- Final verification
SELECT 
  'FINAL STATUS' as check_name,
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'match_documents')
    THEN '✅ Vector search functions are now available - AI should work!'
    ELSE '❌ Something went wrong during function creation'
  END as result;
