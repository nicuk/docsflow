-- ===============================================
-- SCHEMA ANALYSIS: Verify Access Level Alignment
-- 
-- Purpose: Analyze current state before running migration 013
-- Use this to verify my analysis is correct
-- ===============================================

-- 1. CURRENT USER ACCESS LEVELS BY ROLE
SELECT 
  'CURRENT USER ACCESS LEVELS' as analysis_type,
  role,
  access_level,
  COUNT(*) as user_count,
  ARRAY_AGG(email ORDER BY email) as emails
FROM users 
GROUP BY role, access_level
ORDER BY role, access_level;

-- Expected: Admin users probably have access_level=2 (INCORRECT)
-- Expected: User/viewer have access_level=2 (CORRECT)

-- 2. DOCUMENT CHUNKS ACCESS LEVEL DISTRIBUTION
SELECT 
  'DOCUMENT CHUNKS ACCESS LEVELS' as analysis_type,
  dc.access_level,
  COUNT(*) as chunk_count,
  COUNT(DISTINCT dc.document_id) as unique_documents
FROM document_chunks dc
GROUP BY dc.access_level
ORDER BY dc.access_level;

-- Expected: Most chunks have access_level=1 (admin-only by default - PROBLEMATIC)

-- 3. DOCUMENTS VS DOCUMENT_CHUNKS ACCESS ALIGNMENT
SELECT 
  'DOCUMENT ACCESS ALIGNMENT' as analysis_type,
  d.access_level as document_access,
  dc.access_level as chunk_access,
  COUNT(*) as chunk_count
FROM documents d
JOIN document_chunks dc ON d.id = dc.document_id
GROUP BY d.access_level, dc.access_level
ORDER BY d.access_level, dc.access_level;

-- Expected: Misalignment between document.access_level (text) and chunk.access_level (integer)

-- 4. SCHEMA CONSTRAINTS VERIFICATION
SELECT 
  'SCHEMA CONSTRAINTS' as analysis_type,
  table_name,
  column_name,
  column_default,
  check_clause
FROM information_schema.columns c
LEFT JOIN information_schema.check_constraints cc ON cc.constraint_name LIKE '%' || c.table_name || '%access_level%'
WHERE c.column_name = 'access_level'
  AND c.table_schema = 'public'
ORDER BY table_name;

-- Expected: Users default to 2, document_chunks default to 1

-- 5. PROBLEMATIC SCENARIOS (What my migration will fix)
SELECT 
  'ADMIN USERS WITH WRONG ACCESS LEVEL' as issue_type,
  email,
  role,
  access_level,
  CASE 
    WHEN role = 'admin' AND access_level != 1 THEN 'NEEDS FIX'
    ELSE 'OK'
  END as status
FROM users
WHERE role = 'admin';

-- 6. INACCESSIBLE DOCUMENT CHUNKS
SELECT 
  'POTENTIALLY INACCESSIBLE CHUNKS' as issue_type,
  COUNT(*) as admin_only_chunks,
  COUNT(DISTINCT dc.document_id) as admin_only_documents
FROM document_chunks dc
JOIN documents d ON d.id = dc.document_id
WHERE dc.access_level = 1  -- Admin-only chunks
  AND d.access_level != 'admin_only';  -- But document is not explicitly admin-only

-- Expected: Many chunks marked admin-only when documents are user-accessible

-- 7. WHAT MIGRATION 013 WILL CHANGE
SELECT 
  'MIGRATION 013 IMPACT PREVIEW' as preview_type,
  'Users' as table_name,
  COUNT(*) as records_to_change
FROM users 
WHERE (role = 'admin' AND access_level != 1) 
   OR (role IN ('user', 'viewer') AND access_level != 2)
   OR access_level NOT IN (1, 2)

UNION ALL

SELECT 
  'MIGRATION 013 IMPACT PREVIEW' as preview_type,
  'Document Chunks' as table_name,
  COUNT(*) as records_to_change
FROM document_chunks dc
WHERE dc.access_level = 1 
  AND NOT EXISTS (
    SELECT 1 FROM documents d 
    WHERE d.id = dc.document_id 
    AND d.access_level = 'admin_only'
  );

-- ===============================================
-- ANALYSIS COMPLETE
-- 
-- Run this first, then compare results with my analysis:
-- - Admin users should have access_level=1 (not 2)
-- - Document chunks defaulting to 1 makes them admin-only
-- - This creates accessibility issues for regular users
-- ===============================================
