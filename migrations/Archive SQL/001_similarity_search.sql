-- Migration: Add similarity_search function for vector search
-- Run this in your Supabase SQL Editor

-- Enable the pgvector extension if not already enabled
CREATE EXTENSION IF NOT EXISTS vector;

-- Create the similarity_search function
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
  WHERE 
    (similarity_search.tenant_id IS NULL OR dc.metadata->>'tenant_id' = similarity_search.tenant_id)
    AND (dc.access_level IS NULL OR dc.access_level <= similarity_search.access_level)
    AND 1 - (dc.embedding <=> query_embedding) > match_threshold
  ORDER BY dc.embedding <=> query_embedding
  LIMIT match_count;
$$;

-- Add access_level column if it doesn't exist
ALTER TABLE document_chunks
ADD COLUMN IF NOT EXISTS access_level INTEGER DEFAULT 1 CHECK (access_level BETWEEN 1 AND 5);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS document_chunks_embedding_idx ON document_chunks USING ivfflat (embedding vector_cosine_ops);
CREATE INDEX IF NOT EXISTS document_chunks_tenant_idx ON document_chunks USING btree ((metadata->>'tenant_id')); 