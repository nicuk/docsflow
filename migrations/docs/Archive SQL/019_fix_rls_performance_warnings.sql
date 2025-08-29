-- FIX RLS PERFORMANCE WARNINGS
-- Addresses Supabase database linter warnings about auth function re-evaluation
-- Issue: auth.role() and auth.uid() are being re-evaluated for each row

BEGIN;

RAISE NOTICE 'Fixing RLS performance warnings by optimizing auth function calls';

-- ========================================
-- PART 1: FIX RLS POLICIES FOR USERS TABLE
-- ========================================

-- Drop the problematic policies
DROP POLICY IF EXISTS "allow_user_registration_service_role" ON public.users;
DROP POLICY IF EXISTS "allow_user_select_service_role" ON public.users;
DROP POLICY IF EXISTS "allow_user_update_service_role" ON public.users;

RAISE NOTICE 'Dropped problematic RLS policies';

-- Create optimized policies using subqueries to prevent re-evaluation
-- Policy 1: INSERT - Optimized for registration
CREATE POLICY "user_registration_optimized" ON public.users
  FOR INSERT 
  WITH CHECK (
    -- Use subquery to evaluate auth functions only once
    (SELECT auth.role()) = 'service_role'
    OR id = (SELECT auth.uid())
  );

-- Policy 2: SELECT - Optimized for user access
CREATE POLICY "user_select_optimized" ON public.users
  FOR SELECT USING (
    -- Use subquery to evaluate auth functions only once
    (SELECT auth.role()) = 'service_role'
    OR id = (SELECT auth.uid())
    OR (
      tenant_id IS NOT NULL 
      AND tenant_id IN (
        SELECT tenant_id FROM users WHERE id = (SELECT auth.uid())
      )
    )
  );

-- Policy 3: UPDATE - Optimized for profile updates
CREATE POLICY "user_update_optimized" ON public.users
  FOR UPDATE USING (
    -- Use subquery to evaluate auth functions only once
    (SELECT auth.role()) = 'service_role'
    OR id = (SELECT auth.uid())
  ) WITH CHECK (
    -- Same check for WITH CHECK clause
    (SELECT auth.role()) = 'service_role'
    OR id = (SELECT auth.uid())
  );

-- Policy 4: DELETE - For completeness (service role only)
CREATE POLICY "user_delete_optimized" ON public.users
  FOR DELETE USING (
    (SELECT auth.role()) = 'service_role'
  );

RAISE NOTICE 'Created optimized RLS policies with subqueries';

-- ========================================
-- PART 2: VERIFY POLICY OPTIMIZATION
-- ========================================

-- Show the new policies
SELECT 
  policyname,
  cmd,
  CASE 
    WHEN qual LIKE '%(SELECT auth.%' THEN 'OPTIMIZED ✅'
    WHEN qual LIKE '%auth.%' THEN 'NEEDS OPTIMIZATION ⚠️'
    ELSE 'NO AUTH FUNCTIONS'
  END as optimization_status
FROM pg_policies 
WHERE tablename = 'users' AND schemaname = 'public'
ORDER BY cmd, policyname;

COMMIT;

-- ========================================
-- PERFORMANCE TEST QUERY
-- ========================================

-- This query will help test if the optimization works
-- Run with EXPLAIN ANALYZE to see if auth functions are called once vs per row
/*
EXPLAIN (ANALYZE, BUFFERS) 
SELECT count(*) 
FROM users 
WHERE tenant_id = '123e4567-e89b-12d3-a456-426614174000';
*/

RAISE NOTICE 'RLS performance optimization complete!';
RAISE NOTICE 'Run EXPLAIN ANALYZE on user queries to verify performance improvement';