-- SURGICAL RLS FIX - ADDRESSES EXACT LINTER WARNINGS
-- Problem 1: 3 policies still use direct auth.<function>() calls (performance issue)
-- Problem 2: Multiple permissive policies per action (performance degradation)
-- Solution: Replace problematic policies with single optimized versions

BEGIN;

-- SURGICAL RLS FIX: Addressing exact linter warnings systematically

-- ========================================
-- PART 1: IDENTIFY CURRENT POLICY STATE
-- ========================================

-- Show current policies before cleanup
SELECT 
    p.polname as policyname,
    p.polcmd as cmd,
    CASE 
        WHEN p.polname LIKE '%service_role%' THEN 'LEGACY (needs auth function fix)'
        WHEN p.polname LIKE '%subquery_optimized%' THEN 'NEW (should be good)'
        ELSE 'OTHER'
    END as policy_type
FROM pg_policy p
JOIN pg_class c ON p.polrelid = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE c.relname = 'users' AND n.nspname = 'public'
ORDER BY p.polcmd, p.polname;

-- ========================================
-- PART 2: CLEAN REMOVAL OF ALL POLICIES
-- ========================================

-- Remove ALL existing policies to eliminate duplicates
-- Legacy policies (the ones causing auth_rls_initplan warnings)
DROP POLICY IF EXISTS "allow_user_registration_service_role" ON public.users;
DROP POLICY IF EXISTS "allow_user_select_service_role" ON public.users;
DROP POLICY IF EXISTS "allow_user_update_service_role" ON public.users;

-- New policies from previous migrations (may have issues too)
DROP POLICY IF EXISTS "users_insert_subquery_optimized" ON public.users;
DROP POLICY IF EXISTS "users_select_subquery_optimized" ON public.users;
DROP POLICY IF EXISTS "users_update_subquery_optimized" ON public.users;
DROP POLICY IF EXISTS "users_delete_subquery_optimized" ON public.users;

-- Any other variations
DROP POLICY IF EXISTS "users_insert_final" ON public.users;
DROP POLICY IF EXISTS "users_select_final" ON public.users;
DROP POLICY IF EXISTS "users_update_final" ON public.users;
DROP POLICY IF EXISTS "users_delete_final" ON public.users;

-- Removed all existing policies to eliminate duplicates

-- ========================================
-- PART 3: CREATE SINGLE OPTIMIZED POLICY PER ACTION
-- ========================================

-- Based on Supabase documentation: https://supabase.com/docs/guides/database/postgres/row-level-security#call-functions-with-select
-- The key is using (SELECT auth.function()) instead of auth.function()

-- Policy 1: INSERT - Single policy with subquery optimization
CREATE POLICY "users_insert_optimized" ON public.users
  FOR INSERT 
  WITH CHECK (
    -- Service role can insert anyone (for registration API)
    (SELECT auth.role()) = 'service_role'
    -- Authenticated users can insert their own record
    OR (SELECT auth.uid()) = id
  );

-- Policy 2: SELECT - Single policy with subquery optimization
CREATE POLICY "users_select_optimized" ON public.users
  FOR SELECT USING (
    -- Service role can see all users
    (SELECT auth.role()) = 'service_role'
    -- Users can see their own record
    OR (SELECT auth.uid()) = id
    -- Users can see other users in same tenant (for team features)
    OR (
      tenant_id IS NOT NULL 
      AND tenant_id IN (
        SELECT u2.tenant_id FROM users u2 
        WHERE u2.id = (SELECT auth.uid())
      )
    )
  );

-- Policy 3: UPDATE - Single policy with subquery optimization
CREATE POLICY "users_update_optimized" ON public.users
  FOR UPDATE USING (
    -- Service role can update all users
    (SELECT auth.role()) = 'service_role'
    -- Users can update their own record
    OR (SELECT auth.uid()) = id
  ) WITH CHECK (
    -- Same conditions for WITH CHECK
    (SELECT auth.role()) = 'service_role'
    OR (SELECT auth.uid()) = id
  );

-- Policy 4: DELETE - Single policy (service role only for safety)
CREATE POLICY "users_delete_optimized" ON public.users
  FOR DELETE USING (
    -- Only service role can delete users (for admin operations)
    (SELECT auth.role()) = 'service_role'
  );

-- Created single optimized policy per action with proper subqueries

-- ========================================
-- PART 4: VERIFICATION OF THE FIX
-- ========================================

-- Count policies per action to ensure no duplicates
SELECT 
    p.polcmd as action,
    COUNT(*) as policy_count,
    ARRAY_AGG(p.polname) as policy_names
FROM pg_policy p
JOIN pg_class c ON p.polrelid = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE c.relname = 'users' AND n.nspname = 'public'
GROUP BY p.polcmd
ORDER BY p.polcmd;

-- Verify subquery usage (this checks the actual policy definitions)
SELECT 
    p.polname as policyname,
    p.polcmd as cmd,
    -- Check if the policy definition contains subqueries
    CASE 
        WHEN pg_get_expr(p.polqual, c.oid) LIKE '%SubPlan%' 
             OR pg_get_expr(p.polwithcheck, c.oid) LIKE '%SubPlan%' THEN 'SUBQUERY DETECTED ✅'
        WHEN pg_get_expr(p.polqual, c.oid) LIKE '%auth.%' 
             OR pg_get_expr(p.polwithcheck, c.oid) LIKE '%auth.%' THEN 'DIRECT AUTH CALL ⚠️'
        ELSE 'NO AUTH FUNCTIONS'
    END as optimization_status
FROM pg_policy p
JOIN pg_class c ON p.polrelid = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE c.relname = 'users' AND n.nspname = 'public'
ORDER BY p.polname;

COMMIT;

-- ========================================
-- FINAL VERIFICATION REPORT
-- ========================================

DO $$
DECLARE
    total_policies INTEGER;
    insert_policies INTEGER;
    select_policies INTEGER;
    update_policies INTEGER;
    delete_policies INTEGER;
BEGIN
    -- Count total policies
    SELECT COUNT(*) INTO total_policies
    FROM pg_policy p
    JOIN pg_class c ON p.polrelid = c.oid
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE c.relname = 'users' AND n.nspname = 'public';
    
    -- Count policies per action
    SELECT COUNT(*) INTO insert_policies 
    FROM pg_policy p
    JOIN pg_class c ON p.polrelid = c.oid
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE c.relname = 'users' AND n.nspname = 'public' AND p.polcmd = 'INSERT';
    
    SELECT COUNT(*) INTO select_policies 
    FROM pg_policy p
    JOIN pg_class c ON p.polrelid = c.oid
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE c.relname = 'users' AND n.nspname = 'public' AND p.polcmd = 'SELECT';
    
    SELECT COUNT(*) INTO update_policies 
    FROM pg_policy p
    JOIN pg_class c ON p.polrelid = c.oid
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE c.relname = 'users' AND n.nspname = 'public' AND p.polcmd = 'UPDATE';
    
    SELECT COUNT(*) INTO delete_policies 
    FROM pg_policy p
    JOIN pg_class c ON p.polrelid = c.oid
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE c.relname = 'users' AND n.nspname = 'public' AND p.polcmd = 'DELETE';
    
    RAISE NOTICE '=== SURGICAL RLS FIX RESULTS ===';
    RAISE NOTICE 'Total policies on users table: %', total_policies;
    RAISE NOTICE 'INSERT policies: % (should be 1)', insert_policies;
    RAISE NOTICE 'SELECT policies: % (should be 1)', select_policies;
    RAISE NOTICE 'UPDATE policies: % (should be 1)', update_policies;
    RAISE NOTICE 'DELETE policies: % (should be 1)', delete_policies;
    
    IF total_policies = 4 AND insert_policies = 1 AND select_policies = 1 AND update_policies = 1 AND delete_policies = 1 THEN
        RAISE NOTICE 'SUCCESS: Single optimized policy per action created!';
        RAISE NOTICE 'Expected result: All 16 linter warnings should be resolved';
        RAISE NOTICE '- 3 auth_rls_initplan warnings fixed (subqueries implemented)';
        RAISE NOTICE '- 13 multiple_permissive_policies warnings fixed (duplicates removed)';
    ELSE
        RAISE WARNING 'UNEXPECTED: Policy count mismatch - manual verification needed';
    END IF;
END $$;

-- Surgical RLS fix complete - check Supabase linter for confirmation
