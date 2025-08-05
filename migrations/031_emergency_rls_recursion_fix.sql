-- EMERGENCY RLS RECURSION FIX
-- CRITICAL: The SELECT policy is causing infinite recursion
-- This is breaking all authentication and must be fixed immediately

BEGIN;

-- ========================================
-- EMERGENCY: DROP THE PROBLEMATIC POLICY
-- ========================================

-- The users_select_optimized policy has infinite recursion
-- It queries the users table from within its own policy condition
DROP POLICY IF EXISTS "users_select_optimized" ON public.users;

-- ========================================
-- CREATE SIMPLE, NON-RECURSIVE POLICY
-- ========================================

-- Simple SELECT policy without self-referencing queries
-- This eliminates the infinite recursion issue
CREATE POLICY "users_select_simple" ON public.users
  FOR SELECT USING (
    -- Service role can see all users
    (SELECT auth.role()) = 'service_role'
    -- Users can see their own record
    OR (SELECT auth.uid()) = id
    -- Note: Removed tenant-based access to prevent recursion
    -- This can be re-implemented later with a different approach
  );

-- ========================================
-- VERIFY NO RECURSION IN OTHER POLICIES
-- ========================================

-- Check that other policies don't have similar issues
-- INSERT policy - should be safe (no self-reference)
-- UPDATE policy - should be safe (no self-reference) 
-- DELETE policy - should be safe (no self-reference)

-- Show current policies to verify
SELECT 
    p.polname as policy_name,
    CASE p.polcmd
        WHEN 'a' THEN 'INSERT'
        WHEN 'r' THEN 'SELECT' 
        WHEN 'w' THEN 'UPDATE'
        WHEN 'd' THEN 'DELETE'
        ELSE p.polcmd
    END as action,
    pg_get_expr(p.polqual, c.oid) as using_expression,
    pg_get_expr(p.polwithcheck, c.oid) as with_check_expression
FROM pg_policy p
JOIN pg_class c ON p.polrelid = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE c.relname = 'users' AND n.nspname = 'public'
ORDER BY p.polname;

COMMIT;

-- ========================================
-- EMERGENCY VERIFICATION
-- ========================================

DO $$
DECLARE
    policy_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO policy_count
    FROM pg_policy p
    JOIN pg_class c ON p.polrelid = c.oid
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE c.relname = 'users' AND n.nspname = 'public';
    
    RAISE NOTICE '=== EMERGENCY RLS RECURSION FIX ===';
    RAISE NOTICE 'Total policies on users table: %', policy_count;
    RAISE NOTICE 'CRITICAL: Infinite recursion should now be resolved';
    RAISE NOTICE 'TEST IMMEDIATELY: Try logging in again';
    RAISE NOTICE 'NOTE: Tenant-based user visibility temporarily disabled to fix recursion';
    RAISE NOTICE 'TODO: Implement tenant access with non-recursive approach later';
END $$;
