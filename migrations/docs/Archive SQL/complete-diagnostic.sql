-- ============================================================================
-- COMPLETE DIAGNOSTIC - All Results in One Query
-- ============================================================================

-- Single comprehensive query to see everything
SELECT 
  'COMPLETE DIAGNOSTIC' as report_type,
  
  -- Document counts
  (SELECT COUNT(*) FROM documents WHERE tenant_id = '122928f6-f34e-484b-9a69-7e1f25caf45c') as total_documents,
  
  -- Chunk counts  
  (SELECT COUNT(*) FROM document_chunks WHERE tenant_id = '122928f6-f34e-484b-9a69-7e1f25caf45c') as total_chunks,
  
  -- Chunks with embeddings
  (SELECT COUNT(*) FROM document_chunks WHERE tenant_id = '122928f6-f34e-484b-9a69-7e1f25caf45c' AND embedding IS NOT NULL) as chunks_with_embeddings,
  
  -- Function exists
  (SELECT COUNT(*) FROM pg_proc WHERE proname = 'match_documents') as match_documents_function_count,
  
  -- Recent document sample
  (SELECT string_agg(filename, ', ') FROM (
    SELECT filename FROM documents 
    WHERE tenant_id = '122928f6-f34e-484b-9a69-7e1f25caf45c' 
    ORDER BY created_at DESC 
    LIMIT 3
  ) recent) as recent_files,
  
  -- Processing status
  (SELECT string_agg(DISTINCT processing_status, ', ') FROM documents WHERE tenant_id = '122928f6-f34e-484b-9a69-7e1f25caf45c') as processing_statuses;
