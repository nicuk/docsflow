-- ============================================
-- NUCLEAR OPTION: Delete ALL vectors and re-upload
-- ============================================
-- This will clear ALL corrupted data from Pinecone
-- Then you can re-upload your documents fresh

-- 1. Get all document IDs for your tenant
SELECT id, filename, mime_type, processing_status, created_at
FROM documents
WHERE tenant_id = 'b89b8fab-0a25-4266-a4d0-306cc4d358cb'
ORDER BY created_at DESC;

-- 2. DELETE ALL DOCUMENTS (will trigger cascading delete to Pinecone via API)
-- WARNING: This deletes EVERYTHING! You'll need to re-upload.

-- Uncomment below to execute:
-- DELETE FROM documents 
-- WHERE tenant_id = 'b89b8fab-0a25-4266-a4d0-306cc4d358cb';

-- 3. After deletion, manually delete the namespace in Pinecone console:
--    https://app.pinecone.io/organizations/-/projects/-/indexes/emerald-oak
--    Go to "Namespaces" tab → Delete namespace "b89b8fab-0a25-4266-a4d0-306cc4d358cb"

-- 4. Re-upload your documents - they will use the NEW working code

