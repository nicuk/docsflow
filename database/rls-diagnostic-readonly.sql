-- ================================================================
-- SAFE READ-ONLY DIAGNOSTIC SCRIPT FOR RLS ISSUES
-- This script ONLY reads data, makes NO changes
-- ================================================================

DO $$
DECLARE
    policy_count INTEGER;
    rls_status BOOLEAN;
    policy_rec RECORD;
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE '🔍 RLS DIAGNOSTIC REPORT FOR TENANTS TABLE';
    RAISE NOTICE '========================================';
    
    -- 1. Check if RLS is enabled
    SELECT relrowsecurity INTO rls_status
    FROM pg_class
    WHERE relname = 'tenants' AND relnamespace = 'public'::regnamespace;
    
    RAISE NOTICE '1. RLS Status: %', 
        CASE WHEN rls_status THEN '✅ ENABLED' ELSE '❌ DISABLED' END;
    
    -- 2. Count policies
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies 
    WHERE tablename = 'tenants' AND schemaname = 'public';
    
    RAISE NOTICE '2. Number of Policies: %', policy_count;
    
    -- 3. List all policies with details
    RAISE NOTICE '3. Policy Details:';
    FOR policy_rec IN 
        SELECT 
            policyname,
            cmd,
            permissive,
            roles,
            qual,
            with_check
        FROM pg_policies 
        WHERE tablename = 'tenants' AND schemaname = 'public'
    LOOP
        RAISE NOTICE '   -------------------';
        RAISE NOTICE '   Policy: %', policy_rec.policyname;
        RAISE NOTICE '   Command: %', policy_rec.cmd;
        RAISE NOTICE '   Permissive: %', policy_rec.permissive;
        RAISE NOTICE '   Roles: %', policy_rec.roles;
        RAISE NOTICE '   USING clause: %', LEFT(policy_rec.qual, 100);
        RAISE NOTICE '   WITH CHECK: %', LEFT(policy_rec.with_check, 100);
    END LOOP;
    
    -- 4. Check current user role
    RAISE NOTICE '4. Current Session Info:';
    RAISE NOTICE '   Current Role: %', current_role;
    RAISE NOTICE '   Session User: %', session_user;
    
    -- 5. Test what auth functions return
    RAISE NOTICE '5. Auth Function Tests:';
    BEGIN
        RAISE NOTICE '   auth.role() = %', auth.role();
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '   auth.role() = ERROR: %', SQLERRM;
    END;
    
    BEGIN
        RAISE NOTICE '   auth.uid() = %', auth.uid();
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '   auth.uid() = NULL or ERROR';
    END;
    
    -- 6. Check JWT claims
    BEGIN
        RAISE NOTICE '   JWT Role Claim: %', 
            current_setting('request.jwt.claims', true)::json->>'role';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '   JWT Role Claim: Not available';
    END;
    
    -- 7. Check if service_role would work
    RAISE NOTICE '6. Service Role Check:';
    IF current_setting('request.jwt.claims', true)::json->>'role' = 'service_role' THEN
        RAISE NOTICE '   ✅ Current session IS service_role';
    ELSE
        RAISE NOTICE '   ❌ Current session is NOT service_role';
        RAISE NOTICE '   Actual role from JWT: %', 
            COALESCE(current_setting('request.jwt.claims', true)::json->>'role', 'none');
    END IF;
    
    -- 8. Summary
    RAISE NOTICE '========================================';
    RAISE NOTICE '📊 DIAGNOSIS SUMMARY:';
    
    IF policy_count = 0 THEN
        RAISE NOTICE '❌ PROBLEM: No policies exist - INSERT will fail';
        RAISE NOTICE '   FIX: Create a policy allowing service_role';
    ELSIF policy_count > 1 THEN
        RAISE NOTICE '⚠️  WARNING: Multiple policies detected (performance issue)';
        RAISE NOTICE '   FIX: Consolidate to single policy';
    END IF;
    
    IF NOT rls_status THEN
        RAISE NOTICE '❌ CRITICAL: RLS is disabled - security risk!';
        RAISE NOTICE '   FIX: Enable RLS after creating policies';
    END IF;
    
    RAISE NOTICE '========================================';
END $$;

-- Additional check: See if we can simulate an INSERT (without actually doing it)
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 
            FROM pg_policies 
            WHERE tablename = 'tenants' 
            AND schemaname = 'public'
            AND cmd = 'INSERT'
            AND (
                qual LIKE '%service_role%' 
                OR with_check LIKE '%service_role%'
            )
        ) THEN '✅ Found INSERT policy mentioning service_role'
        ELSE '❌ No INSERT policy for service_role found'
    END as insert_policy_check;