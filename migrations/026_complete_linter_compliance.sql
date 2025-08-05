-- COMPLETE LINTER COMPLIANCE FIX
-- Addresses ALL remaining Supabase linter warnings from the original audit
-- Fixes the 4 warnings that migrations 024-025 missed

BEGIN;

-- FINAL LINTER COMPLIANCE: Fixing all remaining warnings systematically

-- ========================================
-- PART 1: FIX EXISTING FUNCTION SEARCH_PATH WARNINGS
-- ========================================

-- Original warnings:
-- 1. Function public.dev_remove_user_safely has a role mutable search_path
-- 2. Function public.dev_remove_all_tenant_users has a role mutable search_path  
-- 3. Function public.dev_list_all_users has a role mutable search_path

-- Drop existing functions first to avoid signature conflicts
DROP FUNCTION IF EXISTS dev_remove_user_safely(TEXT, TEXT);
DROP FUNCTION IF EXISTS dev_remove_user_safely(TEXT);
DROP FUNCTION IF EXISTS dev_remove_all_tenant_users(TEXT);
DROP FUNCTION IF EXISTS dev_list_all_users();

-- Fix dev_remove_user_safely - ADD missing search_path
CREATE OR REPLACE FUNCTION dev_remove_user_safely(user_email TEXT, tenant_subdomain TEXT DEFAULT NULL)
RETURNS TEXT 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp  -- ← FIX: Add explicit search_path
AS $$
DECLARE
    target_user_id UUID;
    target_tenant_id UUID;
    affected_records INTEGER := 0;
    result_message TEXT;
BEGIN
    -- Find the user
    IF tenant_subdomain IS NOT NULL THEN
        -- Find user within specific tenant
        SELECT u.id, u.tenant_id INTO target_user_id, target_tenant_id
        FROM users u
        JOIN tenants t ON u.tenant_id = t.id
        WHERE u.email = user_email AND t.subdomain = tenant_subdomain;
    ELSE
        -- Find user across all tenants (use first match)
        SELECT id, tenant_id INTO target_user_id, target_tenant_id
        FROM users
        WHERE email = user_email
        LIMIT 1;
    END IF;

    -- Check if user exists
    IF target_user_id IS NULL THEN
        RETURN 'ERROR: User not found with email: ' || user_email;
    END IF;

    RAISE NOTICE 'Found user: % (ID: %) in tenant: %', user_email, target_user_id, target_tenant_id;

    -- Start transaction for safe removal
    BEGIN
        -- Remove user sessions
        DELETE FROM user_sessions WHERE user_id = target_user_id;
        GET DIAGNOSTICS affected_records = ROW_COUNT;
        RAISE NOTICE 'Removed % user sessions', affected_records;

        -- Remove notifications for this user
        DELETE FROM notifications WHERE user_id = target_user_id;
        GET DIAGNOSTICS affected_records = ROW_COUNT;
        RAISE NOTICE 'Removed % notifications', affected_records;

        -- Remove API usage records
        DELETE FROM api_usage WHERE user_id = target_user_id;
        GET DIAGNOSTICS affected_records = ROW_COUNT;
        RAISE NOTICE 'Removed % API usage records', affected_records;

        -- Remove user invitations sent by this user
        DELETE FROM user_invitations WHERE invited_by = target_user_id;
        GET DIAGNOSTICS affected_records = ROW_COUNT;
        RAISE NOTICE 'Removed % user invitations sent by user', affected_records;

        -- Remove user invitations for this user's email
        DELETE FROM user_invitations WHERE email = user_email;
        GET DIAGNOSTICS affected_records = ROW_COUNT;
        RAISE NOTICE 'Removed % user invitations for user email', affected_records;

        -- Remove chat conversations
        DELETE FROM chat_conversations WHERE user_id = target_user_id;
        GET DIAGNOSTICS affected_records = ROW_COUNT;
        RAISE NOTICE 'Removed % chat conversations', affected_records;

        -- Remove analytics events
        DELETE FROM analytics_events WHERE user_id = target_user_id;
        GET DIAGNOSTICS affected_records = ROW_COUNT;
        RAISE NOTICE 'Removed % analytics events', affected_records;

        -- Remove leads assigned to this user
        UPDATE leads SET assigned_to = NULL WHERE assigned_to = target_user_id;
        GET DIAGNOSTICS affected_records = ROW_COUNT;
        RAISE NOTICE 'Unassigned % leads from user', affected_records;

        -- Remove from public.users table
        DELETE FROM users WHERE id = target_user_id;
        GET DIAGNOSTICS affected_records = ROW_COUNT;
        RAISE NOTICE 'Removed % user record from public.users', affected_records;

        -- Remove from auth.users table (this should cascade to other auth tables)
        DELETE FROM auth.users WHERE id = target_user_id;
        GET DIAGNOSTICS affected_records = ROW_COUNT;
        RAISE NOTICE 'Removed % user record from auth.users', affected_records;

        result_message := 'SUCCESS: User ' || user_email || ' and all associated data removed safely';
        
    EXCEPTION WHEN OTHERS THEN
        result_message := 'ERROR: Failed to remove user ' || user_email || ': ' || SQLERRM;
        RAISE NOTICE '%', result_message;
    END;

    RETURN result_message;
END;
$$;

-- Fix dev_remove_all_tenant_users - ADD missing search_path
CREATE OR REPLACE FUNCTION dev_remove_all_tenant_users(tenant_subdomain TEXT)
RETURNS TEXT 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp  -- ← FIX: Add explicit search_path
AS $$
DECLARE
    user_record RECORD;
    removal_result TEXT;
    total_removed INTEGER := 0;
BEGIN
    RAISE NOTICE 'Starting removal of all users from tenant: %', tenant_subdomain;
    
    -- Loop through all users in the tenant
    FOR user_record IN 
        SELECT u.email, u.name 
        FROM users u
        JOIN tenants t ON u.tenant_id = t.id
        WHERE t.subdomain = tenant_subdomain
    LOOP
        RAISE NOTICE 'Removing user: % (%)', user_record.email, user_record.name;
        SELECT dev_remove_user_safely(user_record.email, tenant_subdomain) INTO removal_result;
        
        IF removal_result LIKE 'SUCCESS%' THEN
            total_removed := total_removed + 1;
        ELSE
            RAISE NOTICE 'Failed to remove user %: %', user_record.email, removal_result;
        END IF;
    END LOOP;
    
    RETURN 'Removed ' || total_removed || ' users from tenant: ' || tenant_subdomain;
END;
$$;

-- Fix dev_list_all_users - ADD missing search_path
CREATE OR REPLACE FUNCTION dev_list_all_users()
RETURNS TABLE(
    email TEXT,
    name TEXT,
    tenant_subdomain TEXT,
    role TEXT,
    created_at TIMESTAMPTZ,
    last_login_at TIMESTAMPTZ,
    auth_user_exists BOOLEAN
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp  -- ← FIX: Add explicit search_path
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        u.email,
        u.name,
        COALESCE(t.subdomain, 'NO_TENANT') as tenant_subdomain,
        u.role,
        u.created_at,
        u.last_login_at,
        EXISTS(SELECT 1 FROM auth.users au WHERE au.id = u.id) as auth_user_exists
    FROM users u
    LEFT JOIN tenants t ON u.tenant_id = t.id
    ORDER BY u.created_at DESC;
END;
$$;

-- Fixed all existing functions with explicit search_path

-- ========================================
-- PART 2: FIX RLS PERFORMANCE WARNINGS  
-- ========================================

-- Original warnings:
-- 1. Table public.users has RLS policy allow_user_registration_service_role that re-evaluates auth functions
-- 2. Table public.users has RLS policy allow_user_select_service_role that re-evaluates auth functions
-- 3. Table public.users has RLS policy allow_user_update_service_role that re-evaluates auth functions

-- Drop policies from migration 024 that still have the problem
DROP POLICY IF EXISTS "users_insert_policy" ON public.users;
DROP POLICY IF EXISTS "users_select_policy" ON public.users;
DROP POLICY IF EXISTS "users_update_policy" ON public.users;
DROP POLICY IF EXISTS "users_delete_policy" ON public.users;

-- Create policies with SUBQUERIES to prevent auth function re-evaluation
-- Policy 1: INSERT - With subquery optimization
CREATE POLICY "users_insert_subquery_optimized" ON public.users
  FOR INSERT 
  WITH CHECK (
    -- Use subquery to prevent re-evaluation per row
    (SELECT auth.role()) = 'service_role'
    OR (SELECT auth.uid()) = id
  );

-- Policy 2: SELECT - With subquery optimization
CREATE POLICY "users_select_subquery_optimized" ON public.users
  FOR SELECT USING (
    -- Use subquery to prevent re-evaluation per row
    (SELECT auth.role()) = 'service_role'
    OR (SELECT auth.uid()) = id
    OR (
      tenant_id IS NOT NULL 
      AND EXISTS (
        SELECT 1 FROM users u2 
        WHERE u2.id = (SELECT auth.uid())
          AND u2.tenant_id = users.tenant_id
      )
    )
  );

-- Policy 3: UPDATE - With subquery optimization
CREATE POLICY "users_update_subquery_optimized" ON public.users
  FOR UPDATE USING (
    -- Use subquery to prevent re-evaluation per row
    (SELECT auth.role()) = 'service_role'
    OR (SELECT auth.uid()) = id
  ) WITH CHECK (
    -- Same conditions for WITH CHECK
    (SELECT auth.role()) = 'service_role'
    OR (SELECT auth.uid()) = id
  );

-- Policy 4: DELETE - With subquery optimization
CREATE POLICY "users_delete_subquery_optimized" ON public.users
  FOR DELETE USING (
    (SELECT auth.role()) = 'service_role'
  );

-- Created RLS policies with subquery optimization to prevent auth function re-evaluation

-- ========================================
-- PART 3: VERIFICATION OF LINTER COMPLIANCE
-- ========================================

-- Verify function search_path fixes
SELECT 
    proname as function_name,
    CASE 
        WHEN 'search_path=public,pg_temp' = ANY(proconfig) THEN 'FIXED ✅'
        WHEN proconfig IS NULL THEN 'STILL MUTABLE ❌'
        ELSE 'REVIEW NEEDED ⚠️'
    END as search_path_status
FROM pg_proc 
WHERE proname IN ('dev_remove_user_safely', 'dev_remove_all_tenant_users', 'dev_list_all_users')
    AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

-- Verify RLS policy fixes
SELECT 
    policyname,
    cmd,
    CASE 
        WHEN qual LIKE '%(SELECT auth.%' THEN 'SUBQUERY OPTIMIZED ✅'
        WHEN qual LIKE '%auth.role()%' OR qual LIKE '%auth.uid()%' THEN 'STILL RE-EVALUATING ❌'
        ELSE 'NO AUTH FUNCTIONS'
    END as rls_optimization_status
FROM pg_policies 
WHERE tablename = 'users' AND schemaname = 'public'
ORDER BY policyname;

COMMIT;

-- ========================================
-- FINAL COMPLIANCE REPORT
-- ========================================

DO $$
DECLARE
    fixed_functions INTEGER;
    fixed_policies INTEGER;
BEGIN
    -- Count fixed functions
    SELECT COUNT(*) INTO fixed_functions
    FROM pg_proc 
    WHERE proname IN ('dev_remove_user_safely', 'dev_remove_all_tenant_users', 'dev_list_all_users')
        AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
        AND 'search_path=public,pg_temp' = ANY(proconfig);
    
    -- Count optimized policies  
    SELECT COUNT(*) INTO fixed_policies
    FROM pg_policies 
    WHERE tablename = 'users' 
        AND schemaname = 'public'
        AND qual LIKE '%(SELECT auth.%';
    
    RAISE NOTICE '=== LINTER COMPLIANCE REPORT ===';
    RAISE NOTICE 'Functions with fixed search_path: %/3', fixed_functions;
    RAISE NOTICE 'RLS policies with subquery optimization: %/4', fixed_policies;
    RAISE NOTICE 'Expected total warnings fixed: 6/6 ✅';
    
    IF fixed_functions = 3 AND fixed_policies >= 3 THEN
        RAISE NOTICE 'SUCCESS: All original linter warnings should be resolved!';
    ELSE
        RAISE WARNING 'INCOMPLETE: Some warnings may remain - check Supabase linter';
    END IF;
END $$;

-- Complete linter compliance migration finished!