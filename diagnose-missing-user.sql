-- ============================================
-- DIAGNOSE MISSING USER RECORD ISSUE
-- User: 63ac9044-d09a-4743-af06-6895759c04fb
-- ============================================

-- 1. Check if user exists in auth.users (should exist)
SELECT 
  id,
  email,
  created_at,
  email_confirmed_at,
  last_sign_in_at
FROM auth.users
WHERE id = '63ac9044-d09a-4743-af06-6895759c04fb';

-- 2. Check if user exists in public.users (likely MISSING)
SELECT 
  id,
  email,
  name,
  role,
  tenant_id,
  created_at
FROM public.users
WHERE id = '63ac9044-d09a-4743-af06-6895759c04fb';

-- 3. Check if there are MULTIPLE rows for this user (unlikely but possible)
SELECT 
  COUNT(*) as row_count,
  id,
  email
FROM public.users
WHERE id = '63ac9044-d09a-4743-af06-6895759c04fb'
GROUP BY id, email;

-- 4. Check ALL users with this email (might have duplicate/wrong ID)
SELECT 
  id,
  email,
  name,
  tenant_id,
  created_at
FROM public.users
WHERE email ILIKE '%63ac9044%' OR id::text LIKE '%63ac9044%';

-- 5. Compare: How many auth.users vs public.users?
SELECT 
  (SELECT COUNT(*) FROM auth.users) as auth_users_count,
  (SELECT COUNT(*) FROM public.users) as public_users_count,
  (SELECT COUNT(*) FROM auth.users) - (SELECT COUNT(*) FROM public.users) as missing_count;

-- ============================================
-- EXPECTED RESULTS:
-- Query 1: Should return 1 row (user exists in auth)
-- Query 2: Should return 0 rows (user MISSING from public - THIS IS THE BUG)
-- Query 3: Should show row_count = 0
-- Query 5: Should show missing_count > 0
-- ============================================

