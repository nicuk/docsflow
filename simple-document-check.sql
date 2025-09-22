-- ============================================================================
-- SIMPLE DOCUMENT CHECK - Find Your 26 Documents
-- ============================================================================

-- 1. How many documents exist for bitto tenant?
SELECT 'DOCUMENTS FOR BITTO' as check_name,
       COUNT(*) as document_count,
       string_agg(DISTINCT processing_status, ', ') as statuses
FROM documents 
WHERE tenant_id = '122928f6-f34e-484b-9a69-7e1f25caf45c';

-- 2. How many chunks exist for bitto tenant?
SELECT 'CHUNKS FOR BITTO' as check_name,
       COUNT(*) as chunk_count,
       COUNT(embedding) as chunks_with_embeddings,
       COUNT(*) - COUNT(embedding) as chunks_without_embeddings
FROM document_chunks 
WHERE tenant_id = '122928f6-f34e-484b-9a69-7e1f25caf45c';

-- 3. Recent documents uploaded
SELECT 'RECENT UPLOADS' as check_name,
       filename,
       processing_status,
       created_at
FROM documents 
WHERE tenant_id = '122928f6-f34e-484b-9a69-7e1f25caf45c'
ORDER BY created_at DESC
LIMIT 5;

-- 4. Check if match_documents function exists
SELECT 'FUNCTION STATUS' as check_name,
       CASE WHEN COUNT(*) > 0 THEN 'EXISTS' ELSE 'MISSING' END as match_documents_status
FROM pg_proc 
WHERE proname = 'match_documents';

-- 5. Sample chunk content (to verify processing worked)
SELECT 'SAMPLE CONTENT' as check_name,
       LEFT(content, 150) as content_preview,
       CASE WHEN embedding IS NOT NULL THEN 'HAS_EMBEDDING' ELSE 'NO_EMBEDDING' END as embedding_status
FROM document_chunks 
WHERE tenant_id = '122928f6-f34e-484b-9a69-7e1f25caf45c'
ORDER BY created_at DESC
LIMIT 3;
