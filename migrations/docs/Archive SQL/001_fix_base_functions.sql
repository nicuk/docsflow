-- ===============================================
-- CRITICAL FIX: Repair Broken Base Schema Functions
-- Must be applied BEFORE security hardening
-- ===============================================

-- Fix 1: Correct get_tenant_stats function with proper column qualification
CREATE OR REPLACE FUNCTION get_tenant_stats(tenant_uuid UUID)
RETURNS TABLE (
  total_leads INTEGER,
  new_leads INTEGER,
  converted_leads INTEGER,
  avg_response_time INTERVAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::INTEGER as total_leads,
    COUNT(*) FILTER (WHERE l.status = 'new')::INTEGER as new_leads,
    COUNT(*) FILTER (WHERE l.status = 'converted')::INTEGER as converted_leads,
    AVG(EXTRACT(EPOCH FROM (li.responded_at - l.created_at)) * INTERVAL '1 second') as avg_response_time
  FROM leads l
  LEFT JOIN lead_interactions li ON l.id = li.lead_id AND li.direction = 'outbound'
  WHERE l.tenant_id = tenant_uuid;
END;
$$ LANGUAGE plpgsql;

-- Fix 2: Correct similarity_search function with proper parameter qualification
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
    AND dc.access_level <= similarity_search.access_level
    AND 1 - (dc.embedding <=> query_embedding) > match_threshold
  ORDER BY dc.embedding <=> query_embedding
  LIMIT match_count;
$$;

-- Validation: Test the corrected functions
DO $$
DECLARE
  test_tenant_id UUID;
  stats_result RECORD;
BEGIN
  -- Get a test tenant ID
  SELECT id INTO test_tenant_id FROM tenants LIMIT 1;
  
  -- Test corrected get_tenant_stats function
  SELECT * INTO stats_result 
  FROM get_tenant_stats(test_tenant_id);
  
  RAISE NOTICE '✅ FUNCTION FIX: get_tenant_stats now works - Total leads: %', 
    COALESCE(stats_result.total_leads, 0);
    
  RAISE NOTICE '✅ FUNCTION FIX: Base schema functions corrected successfully';
END;
$$; 