-- ===============================================
-- CORRECTED ANALYSIS: Get Full Details
-- Previous analysis was incomplete - this gets actual data
-- ===============================================

-- 1. CURRENT USER ACCESS LEVELS BY ROLE (DETAILED)
SELECT 
  'CURRENT USER ACCESS LEVELS' as analysis_type,
  email,
  role,
  access_level,
  tenant_id,
  created_at
FROM users 
ORDER BY role, access_level, email;

-- 2. TENANTS AND THEIR ADMIN USERS
SELECT 
  'TENANT ADMIN MAPPING' as analysis_type,
  t.subdomain,
  t.name as tenant_name,
  u.email,
  u.role,
  u.access_level
FROM tenants t
LEFT JOIN users u ON u.tenant_id = t.id AND u.role = 'admin'
ORDER BY t.subdomain;

-- 3. DOCUMENT CHUNKS CURRENT STATE
SELECT 
  'DOCUMENT CHUNKS STATE' as analysis_type,
  dc.access_level,
  COUNT(*) as chunk_count,
  MIN(dc.created_at) as oldest_chunk,
  MAX(dc.created_at) as newest_chunk
FROM document_chunks dc
GROUP BY dc.access_level
ORDER BY dc.access_level;

-- 4. SPECIFIC ADMIN USER THAT NEEDS FIXING
SELECT 
  'SPECIFIC ADMIN TO FIX' as analysis_type,
  email,
  role,
  access_level,
  CASE 
    WHEN role = 'admin' AND access_level != 1 THEN 'NEEDS FIX: Should be level 1'
    WHEN role = 'admin' AND access_level = 1 THEN 'CORRECT: Already level 1'
    ELSE 'NOT ADMIN'
  END as status
FROM users
WHERE role = 'admin';

-- 5. CHECK IF MIGRATION 012 ALREADY RAN
SELECT 
  'MIGRATION 012 STATUS' as analysis_type,
  EXISTS(
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name LIKE '%access_level_check%'
  ) as migration_012_applied;

-- 6. ACTUAL CONSTRAINT VALUES (PostgreSQL specific)
SELECT 
  'CURRENT CONSTRAINTS' as analysis_type,
  conname as constraint_name,
  conrelid::regclass as table_name,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conname LIKE '%access_level%'
ORDER BY conrelid::regclass;
