-- SCHEMA FIXES FOR PRODUCTION DEPLOYMENT
-- Run these fixes before deploying to production

-- 1. Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Fix inconsistent tenant_id types (standardize to UUID)
-- Note: This requires careful migration of existing data

-- Fix documents table
ALTER TABLE documents ALTER COLUMN tenant_id TYPE uuid USING tenant_id::uuid;

-- Fix search_history table  
ALTER TABLE search_history ALTER COLUMN tenant_id TYPE uuid USING tenant_id::uuid;

-- 3. Fix embedding column type
ALTER TABLE document_chunks ALTER COLUMN embedding TYPE vector(768);

-- 4. Add missing foreign key constraints
ALTER TABLE documents ADD CONSTRAINT documents_tenant_id_fkey 
  FOREIGN KEY (tenant_id) REFERENCES tenants(id);

ALTER TABLE search_history ADD CONSTRAINT search_history_tenant_id_fkey 
  FOREIGN KEY (tenant_id) REFERENCES tenants(id);

-- 5. Add critical indexes for performance
CREATE INDEX idx_document_chunks_tenant_embedding ON document_chunks 
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

CREATE INDEX idx_document_chunks_tenant_access ON document_chunks 
  (tenant_id, access_level);

CREATE INDEX idx_documents_tenant_status ON documents 
  (tenant_id, processing_status);

CREATE INDEX idx_search_history_tenant_created ON search_history 
  (tenant_id, created_at DESC);

-- 6. Add Row Level Security policies
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE search_history ENABLE ROW LEVEL SECURITY;

-- Basic RLS policies (customize based on your auth system)
CREATE POLICY "Tenants can only see their own data" ON tenants
  FOR ALL USING (id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY "Users can only see their tenant data" ON users
  FOR ALL USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY "Documents are tenant-isolated" ON documents
  FOR ALL USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY "Document chunks are tenant-isolated" ON document_chunks
  FOR ALL USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY "Search history is tenant-isolated" ON search_history
  FOR ALL USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

-- 7. Add vector similarity search function
CREATE OR REPLACE FUNCTION similarity_search(
  query_embedding vector(768),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 5,
  tenant_filter uuid DEFAULT NULL,
  access_level_filter int DEFAULT 1
)
RETURNS TABLE (
  id uuid,
  content text,
  similarity float,
  document_id uuid,
  chunk_index int,
  filename text
)
LANGUAGE sql STABLE
AS $$
  SELECT
    dc.id,
    dc.content,
    1 - (dc.embedding <=> query_embedding) as similarity,
    dc.document_id,
    dc.chunk_index,
    d.filename
  FROM document_chunks dc
  JOIN documents d ON dc.document_id = d.id
  WHERE 
    (tenant_filter IS NULL OR dc.tenant_id = tenant_filter)
    AND dc.access_level <= access_level_filter
    AND 1 - (dc.embedding <=> query_embedding) > match_threshold
  ORDER BY dc.embedding <=> query_embedding
  LIMIT match_count;
$$; 