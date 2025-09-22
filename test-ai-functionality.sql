-- ============================================================================
-- FINAL TEST: Verify AI Can Now Find Documents
-- ============================================================================

-- 1. Confirm functions are available
SELECT 'FUNCTION VERIFICATION' as test_name,
       COUNT(*) as functions_created
FROM pg_proc 
WHERE proname IN ('match_documents', 'match_document_chunks', 'search_documents');

-- 2. Test that search would return results for bitto tenant
SELECT 'BITTO SEARCHABLE CONTENT' as test_name,
       COUNT(*) as searchable_chunks,
       COUNT(DISTINCT document_id) as searchable_documents
FROM document_chunks 
WHERE tenant_id = '122928f6-f34e-484b-9a69-7e1f25caf45c'
  AND embedding IS NOT NULL;

-- 3. Show sample searchable content
SELECT 'SAMPLE SEARCHABLE CONTENT' as test_name,
       d.filename,
       LEFT(dc.content, 100) as content_preview
FROM documents d
JOIN document_chunks dc ON d.id = dc.document_id
WHERE d.tenant_id = '122928f6-f34e-484b-9a69-7e1f25caf45c'
  AND dc.embedding IS NOT NULL
ORDER BY d.created_at DESC
LIMIT 3;

SELECT '🎉 AI SHOULD NOW WORK!' as status,
       'Try asking questions about your documents in the chat interface' as next_step;
