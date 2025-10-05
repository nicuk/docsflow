-- ============================================
-- CLEANUP IMAGE GARBAGE
-- Removes corrupted image documents that were processed as binary
-- ============================================

-- 1️⃣ FIND ALL CORRUPTED IMAGES
-- These are images that fell back to text parsing (Type: fallback)
SELECT 
    d.id,
    d.filename,
    d.mime_type,
    d.metadata->>'chunk_count' as chunks,
    d.metadata->>'parse_method' as parser,
    d.created_at,
    'CORRUPTED - Should re-upload' as status
FROM documents d
WHERE d.tenant_id = 'b89b8fab-0a25-4266-a4d0-306cc4d358cb' -- Replace with your tenant_id
  AND d.mime_type LIKE 'image/%'
  AND d.metadata->>'parse_method' = 'fallback'
ORDER BY d.created_at DESC;

-- 2️⃣ DELETE SPECIFIC CORRUPTED IMAGE
-- Replace the document ID with the one you want to delete
-- Example: DELETE FROM documents WHERE id = '5e451b39-48bc-4ff4-b86b-6d0f2a58164f';

-- DELETE FROM documents 
-- WHERE id = 'YOUR_DOCUMENT_ID_HERE'
-- AND tenant_id = 'b89b8fab-0a25-4266-a4d0-306cc4d358cb';

-- 3️⃣ DELETE ALL CORRUPTED IMAGES AT ONCE (DANGEROUS!)
-- Uncomment below to delete ALL images with fallback parsing
-- WARNING: This will delete ALL corrupted images!

-- DELETE FROM documents
-- WHERE tenant_id = 'b89b8fab-0a25-4266-a4d0-306cc4d358cb'
--   AND mime_type LIKE 'image/%'
--   AND metadata->>'parse_method' = 'fallback';

-- ============================================
-- AFTER DELETION:
-- 1. The document will be deleted from Supabase
-- 2. Pinecone vectors will be deleted (cascading delete)
-- 3. Re-upload the image to use Gemini OCR
-- ============================================

