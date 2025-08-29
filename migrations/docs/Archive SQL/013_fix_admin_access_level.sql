-- ===============================================
-- SURGICAL FIX: Admin Access Level Correction
-- 
-- ISSUE: Admin users have access_level=2 instead of 1
-- ROOT CAUSE: Migration 008 used 1-5 scale, Migration 012 used 1-2 scale
-- SOLUTION: Update admin role to access_level=1
-- ===============================================

BEGIN;

-- Fix admin users who incorrectly have access_level=2
UPDATE users 
SET access_level = 1 
WHERE role = 'admin' AND access_level = 2;

-- Verify user access levels align with roles
UPDATE users 
SET access_level = CASE 
  WHEN role = 'admin' THEN 1    -- Admin gets highest privilege (1)
  WHEN role = 'user' THEN 2     -- User gets standard privilege (2) 
  WHEN role = 'viewer' THEN 2   -- Viewer gets standard privilege (2)
  ELSE 2                        -- Default to user level
END
WHERE access_level NOT IN (1, 2) OR 
      (role = 'admin' AND access_level != 1) OR
      (role IN ('user', 'viewer') AND access_level != 2);

-- CRITICAL FIX: Document chunks defaulting to admin-only (level 1) makes them inaccessible
-- Update existing document chunks to user-accessible level (2) unless explicitly admin-only
UPDATE document_chunks 
SET access_level = 2 
WHERE access_level = 1 
  AND NOT EXISTS (
    -- Keep admin-only if document is explicitly admin-only
    SELECT 1 FROM documents d 
    WHERE d.id = document_chunks.document_id 
    AND d.access_level = 'admin_only'
  );

-- Audit: Log the changes
INSERT INTO analytics_events (
  tenant_id, 
  event_type, 
  event_data,
  created_at
) 
SELECT 
  u.tenant_id,
  'access_level_correction',
  jsonb_build_object(
    'migration', '013_fix_admin_access_level',
    'user_id', u.id,
    'email', u.email,
    'role', u.role,
    'corrected_access_level', u.access_level,
    'issue_fixed', 'admin_access_level_alignment'
  ),
  NOW()
FROM users u
WHERE u.role = 'admin';

COMMIT;

-- Verification Query (for manual check)
-- SELECT email, role, access_level FROM users WHERE role = 'admin';
-- Expected: All admin users should have access_level = 1
