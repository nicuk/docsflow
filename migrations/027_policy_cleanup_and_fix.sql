-- POLICY CLEANUP AND PROPER RLS FIX
-- Removes ALL old policies and creates correct ones
-- Addresses the fact that old problematic policies are still active

BEGIN;

-- ========================================
-- PART 1: NUCLEAR CLEANUP - DROP ALL USER POLICIES
-- ========================================

-- Drop ALL existing policies on users table (both old and new)
DROP POLICY IF EXISTS "allow_user_registration_service_role" ON public.users;
DROP POLICY IF EXISTS "allow_user_select_service_role" ON public.users;
DROP POLICY IF EXISTS "allow_user_update_service_role" ON public.users;
DROP POLICY IF EXISTS "users_insert_subquery_optimized" ON public.users;
DROP POLICY IF EXISTS "users_select_subquery_optimized" ON public.users;
DROP POLICY IF EXISTS "users_update_subquery_optimized" ON public.users;
DROP POLICY IF EXISTS "users_delete_subquery_optimized" ON public.users;

-- Drop any other possible policy variations
DROP POLICY IF EXISTS "users_insert_policy" ON public.users;
DROP POLICY IF EXISTS "users_select_policy" ON public.users;
DROP POLICY IF EXISTS "users_update_policy" ON public.users;
DROP POLICY IF EXISTS "users_delete_policy" ON public.users;
DROP POLICY IF EXISTS "user_registration_optimized" ON public.users;
DROP POLICY IF EXISTS "user_select_optimized" ON public.users;
DROP POLICY IF EXISTS "user_update_optimized" ON public.users;
DROP POLICY IF EXISTS "user_delete_optimized" ON public.users;

-- ========================================
-- PART 2: CREATE CORRECT POLICIES WITH PROPER SUBQUERIES
-- ========================================

-- The linter wants subqueries like (SELECT auth.role()) to prevent re-evaluation
-- Let me check what the actual qualification text should look like

-- Policy 1: INSERT - Correct subquery format
CREATE POLICY "users_insert_final" ON public.users
  FOR INSERT 
  WITH CHECK (
    (SELECT auth.role()) = 'service_role'
    OR (SELECT auth.uid()) = id
  );

-- Policy 2: SELECT - Correct subquery format  
CREATE POLICY "users_select_final" ON public.users
  FOR SELECT USING (
    (SELECT auth.role()) = 'service_role'
    OR (SELECT auth.uid()) = id
    OR (
      tenant_id IS NOT NULL 
      AND tenant_id IN (
        SELECT u2.tenant_id FROM users u2 
        WHERE u2.id = (SELECT auth.uid())
      )
    )
  );

-- Policy 3: UPDATE - Correct subquery format
CREATE POLICY "users_update_final" ON public.users
  FOR UPDATE USING (
    (SELECT auth.role()) = 'service_role'
    OR (SELECT auth.uid()) = id
  ) WITH CHECK (
    (SELECT auth.role()) = 'service_role'
    OR (SELECT auth.uid()) = id
  );

-- Policy 4: DELETE - Correct subquery format
CREATE POLICY "users_delete_final" ON public.users
  FOR DELETE USING (
    (SELECT auth.role()) = 'service_role'
  );

-- ========================================
-- PART 3: VERIFY THE FIX WORKED
-- ========================================

-- Check that only our new policies exist
SELECT 
    policyname,
    cmd,
    CASE 
        WHEN qual LIKE '%(SELECT auth.role())%' AND qual LIKE '%(SELECT auth.uid())%' THEN 'FULLY OPTIMIZED ✅'
        WHEN qual LIKE '%(SELECT auth.role())%' OR qual LIKE '%(SELECT auth.uid())%' THEN 'PARTIALLY OPTIMIZED ✅'
        WHEN qual LIKE '%auth.role()%' OR qual LIKE '%auth.uid()%' THEN 'STILL RE-EVALUATING ❌'
        ELSE 'NO AUTH FUNCTIONS'
    END as optimization_status,
    qual as policy_condition
FROM pg_policies 
WHERE tablename = 'users' AND schemaname = 'public'
ORDER BY policyname;

COMMIT;

-- ========================================
-- VERIFICATION REPORT
-- ========================================

DO $$
DECLARE
    policy_count INTEGER;
    optimized_count INTEGER;
BEGIN
    -- Count total policies
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies 
    WHERE tablename = 'users' AND schemaname = 'public';
    
    -- Count properly optimized policies
    SELECT COUNT(*) INTO optimized_count
    FROM pg_policies 
    WHERE tablename = 'users' 
        AND schemaname = 'public'
        AND (qual LIKE '%(SELECT auth.role())%' OR qual LIKE '%(SELECT auth.uid())%');
    
    RAISE NOTICE '=== POLICY CLEANUP REPORT ===';
    RAISE NOTICE 'Total policies on users table: %', policy_count;
    RAISE NOTICE 'Policies with subquery optimization: %', optimized_count;
    
    IF policy_count = 4 AND optimized_count >= 3 THEN
        RAISE NOTICE 'SUCCESS: Policy cleanup complete, RLS warnings should be resolved!';
    ELSE
        RAISE WARNING 'CHECK NEEDED: Unexpected policy count or optimization status';
    END IF;
END $$;