-- COMPREHENSIVE USER SYSTEM FIX
-- Based on actual schema from migrations/Schema implemented.md
-- Fixes: RLS policies, user cleanup, and security warnings

BEGIN;

-- ========================================
-- PART 1: AUDIT CURRENT STATE
-- ========================================

DO $$
DECLARE
    auth_user_count INTEGER;
    public_user_count INTEGER;
    policy_count INTEGER;
    user_record RECORD;
BEGIN
    RAISE NOTICE '=== CURRENT SYSTEM STATE AUDIT ===';
    
    -- Count users in both tables
    SELECT COUNT(*) INTO auth_user_count FROM auth.users;
    SELECT COUNT(*) INTO public_user_count FROM public.users;
    SELECT COUNT(*) INTO policy_count FROM pg_policies WHERE tablename = 'users' AND schemaname = 'public';
    
    RAISE NOTICE 'Users in auth.users: %', auth_user_count;
    RAISE NOTICE 'Users in public.users: %', public_user_count;
    RAISE NOTICE 'RLS policies on public.users: %', policy_count;
    
    -- List all users for reference
    RAISE NOTICE '--- AUTH.USERS ---';
    FOR user_record IN SELECT email, id, created_at FROM auth.users ORDER BY created_at LOOP
        RAISE NOTICE '  % | %', COALESCE(user_record.email, 'NO EMAIL'), user_record.id;
    END LOOP;
    
    RAISE NOTICE '--- PUBLIC.USERS ---';
    FOR user_record IN SELECT email, name, tenant_id, id FROM public.users ORDER BY created_at LOOP
        RAISE NOTICE '  % | % | tenant: %', user_record.email, user_record.name, COALESCE(user_record.tenant_id::text, 'NULL');
    END LOOP;
    
    -- List current RLS policies
    RAISE NOTICE '--- CURRENT RLS POLICIES ---';
    FOR user_record IN 
        SELECT policyname, cmd, qual, with_check 
        FROM pg_policies 
        WHERE tablename = 'users' AND schemaname = 'public'
    LOOP
        RAISE NOTICE '  Policy: % | Command: %', user_record.policyname, user_record.cmd;
    END LOOP;
END $$;

-- ========================================
-- PART 2: FIX RLS POLICIES (CRITICAL)
-- ========================================

RAISE NOTICE '=== FIXING RLS POLICIES ===';

-- Drop all existing policies to start fresh
DROP POLICY IF EXISTS "Users can only see users in their tenant" ON users;
DROP POLICY IF EXISTS "Users can update their own profile" ON users;
DROP POLICY IF EXISTS "Service role can manage all users" ON users;
DROP POLICY IF EXISTS "users_access_optimized" ON users;
DROP POLICY IF EXISTS "users_optimized_fixed" ON users;
DROP POLICY IF EXISTS "Optimized user tenant access" ON users;
DROP POLICY IF EXISTS "Safe user access" ON users;
DROP POLICY IF EXISTS "user_access_policy" ON users;
DROP POLICY IF EXISTS "Allow user registration" ON users;
DROP POLICY IF EXISTS "Users can see tenant users" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Service role can delete users" ON users;

RAISE NOTICE 'Dropped all existing RLS policies';

-- Create new comprehensive RLS policies based on actual schema
-- Policy 1: Allow user registration (CRITICAL - this was missing!)
CREATE POLICY "user_registration_policy" ON users
  FOR INSERT 
  WITH CHECK (
    -- Allow authenticated users to insert their own record
    auth.uid() = id
    -- OR allow service role to insert any user
    OR auth.role() = 'service_role'
  );

-- Policy 2: Users can see users in their tenant
CREATE POLICY "user_select_policy" ON users
  FOR SELECT USING (
    -- Users can see other users in their tenant
    (tenant_id IS NOT NULL AND tenant_id IN (
      SELECT tenant_id FROM users WHERE id = auth.uid()
    ))
    -- OR users can see their own record even if tenant_id is NULL
    OR id = auth.uid()
    -- OR service role can see all
    OR auth.role() = 'service_role'
  );

-- Policy 3: Users can update their own profile
CREATE POLICY "user_update_policy" ON users
  FOR UPDATE USING (
    -- Users can update their own record
    id = auth.uid()
    -- OR service role can update any user
    OR auth.role() = 'service_role'
  );

-- Policy 4: Only service role can delete users
CREATE POLICY "user_delete_policy" ON users
  FOR DELETE USING (
    auth.role() = 'service_role'
  );

RAISE NOTICE 'Created 4 new RLS policies for users table';

-- ========================================
-- PART 3: CREATE SECURE CLEANUP FUNCTIONS
-- ========================================

RAISE NOTICE '=== CREATING SECURE CLEANUP FUNCTIONS ===';

-- Function 1: Complete user cleanup (both auth and public tables)
CREATE OR REPLACE FUNCTION dev_complete_user_cleanup_secure()
RETURNS TEXT 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $func$
DECLARE
    user_record RECORD;
    affected_records INTEGER := 0;
    total_public_removed INTEGER := 0;
    total_auth_removed INTEGER := 0;
    main_user_id UUID;
BEGIN
    -- Find main user to preserve
    SELECT id INTO main_user_id FROM auth.users WHERE email = 'wellnickchin@gmail.com';
    
    IF main_user_id IS NULL THEN
        RAISE WARNING 'Main user wellnickchin@gmail.com not found!';
    ELSE
        RAISE NOTICE 'Preserving main user: %', main_user_id;
    END IF;

    -- Clean related data first
    RAISE NOTICE 'Cleaning related data...';
    
    -- Remove chat messages
    DELETE FROM public.chat_messages 
    WHERE conversation_id IN (
        SELECT id FROM public.chat_conversations 
        WHERE user_id IN (
            SELECT id FROM public.users WHERE email != 'wellnickchin@gmail.com'
        )
    );
    GET DIAGNOSTICS affected_records = ROW_COUNT;
    RAISE NOTICE 'Removed % chat messages', affected_records;

    -- Remove chat conversations
    DELETE FROM public.chat_conversations 
    WHERE user_id IN (
        SELECT id FROM public.users WHERE email != 'wellnickchin@gmail.com'
    );
    GET DIAGNOSTICS affected_records = ROW_COUNT;
    RAISE NOTICE 'Removed % chat conversations', affected_records;

    -- Remove user sessions
    DELETE FROM public.user_sessions 
    WHERE user_id IN (
        SELECT id FROM public.users WHERE email != 'wellnickchin@gmail.com'
    );
    GET DIAGNOSTICS affected_records = ROW_COUNT;
    RAISE NOTICE 'Removed % user sessions', affected_records;

    -- Remove notifications
    DELETE FROM public.notifications 
    WHERE user_id IN (
        SELECT id FROM public.users WHERE email != 'wellnickchin@gmail.com'
    );
    GET DIAGNOSTICS affected_records = ROW_COUNT;
    RAISE NOTICE 'Removed % notifications', affected_records;

    -- Remove API usage
    DELETE FROM public.api_usage 
    WHERE user_id IN (
        SELECT id FROM public.users WHERE email != 'wellnickchin@gmail.com'
    );
    GET DIAGNOSTICS affected_records = ROW_COUNT;
    RAISE NOTICE 'Removed % API usage records', affected_records;

    -- Remove file uploads
    DELETE FROM public.file_uploads 
    WHERE uploaded_by IN (
        SELECT id FROM public.users WHERE email != 'wellnickchin@gmail.com'
    );
    GET DIAGNOSTICS affected_records = ROW_COUNT;
    RAISE NOTICE 'Removed % file uploads', affected_records;

    -- Unassign leads
    UPDATE public.leads 
    SET assigned_to = NULL 
    WHERE assigned_to IN (
        SELECT id FROM public.users WHERE email != 'wellnickchin@gmail.com'
    );
    GET DIAGNOSTICS affected_records = ROW_COUNT;
    RAISE NOTICE 'Unassigned % leads', affected_records;

    -- Remove user invitations
    DELETE FROM public.user_invitations 
    WHERE invited_by IN (
        SELECT id FROM public.users WHERE email != 'wellnickchin@gmail.com'
    ) OR accepted_by IN (
        SELECT id FROM public.users WHERE email != 'wellnickchin@gmail.com'
    );
    GET DIAGNOSTICS affected_records = ROW_COUNT;
    RAISE NOTICE 'Removed % user invitations', affected_records;

    -- Remove from public.users
    DELETE FROM public.users WHERE email != 'wellnickchin@gmail.com';
    GET DIAGNOSTICS total_public_removed = ROW_COUNT;
    RAISE NOTICE 'Removed % users from public.users', total_public_removed;

    -- Remove from auth.users (the key step!)
    DELETE FROM auth.users 
    WHERE email != 'wellnickchin@gmail.com' OR email IS NULL;
    GET DIAGNOSTICS total_auth_removed = ROW_COUNT;
    RAISE NOTICE 'Removed % users from auth.users', total_auth_removed;

    RETURN 'SUCCESS: Removed ' || total_public_removed || ' from public.users and ' || total_auth_removed || ' from auth.users';

EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'ERROR during cleanup: %', SQLERRM;
END;
$func$;

-- Function 2: List all users from both tables
CREATE OR REPLACE FUNCTION dev_list_all_users_complete_secure()
RETURNS TABLE(
    source TEXT,
    user_id UUID,
    email TEXT,
    name TEXT,
    tenant_id UUID,
    created_at TIMESTAMPTZ
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $func$
BEGIN
    RETURN QUERY
    SELECT 
        'public.users'::TEXT as source,
        u.id,
        u.email,
        u.name,
        u.tenant_id,
        u.created_at
    FROM public.users u
    UNION ALL
    SELECT 
        'auth.users'::TEXT as source,
        au.id,
        au.email,
        NULL::TEXT as name,
        NULL::UUID as tenant_id,
        au.created_at
    FROM auth.users au
    ORDER BY source, email;
END;
$func$;

-- Function 3: Check login capability of test users
CREATE OR REPLACE FUNCTION dev_check_user_login_capability_secure()
RETURNS TABLE(
    email TEXT,
    has_auth_record BOOLEAN,
    has_public_record BOOLEAN,
    can_login BOOLEAN,
    tenant_subdomain TEXT,
    user_role TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $func$
BEGIN
    RETURN QUERY
    WITH auth_users AS (
        SELECT au.email, au.id as auth_id
        FROM auth.users au
        WHERE au.email IS NOT NULL
    ),
    public_users AS (
        SELECT pu.email, pu.id as public_id, pu.role, t.subdomain
        FROM public.users pu
        LEFT JOIN public.tenants t ON pu.tenant_id = t.id
    )
    SELECT 
        COALESCE(au.email, pu.email) as email,
        (au.auth_id IS NOT NULL) as has_auth_record,
        (pu.public_id IS NOT NULL) as has_public_record,
        (au.auth_id IS NOT NULL AND pu.public_id IS NOT NULL) as can_login,
        pu.subdomain as tenant_subdomain,
        pu.role as user_role
    FROM auth_users au
    FULL OUTER JOIN public_users pu ON au.email = pu.email
    ORDER BY email;
END;
$func$;

RAISE NOTICE 'Created 3 secure cleanup functions with proper search_path';

-- ========================================
-- PART 4: VERIFY FIXES
-- ========================================

DO $$
DECLARE
    policy_count INTEGER;
    policy_record RECORD;
BEGIN
    RAISE NOTICE '=== VERIFICATION ===';
    
    -- Check RLS policies
    SELECT COUNT(*) INTO policy_count FROM pg_policies WHERE tablename = 'users' AND schemaname = 'public';
    RAISE NOTICE 'RLS policies on users table: %', policy_count;
    
    FOR policy_record IN 
        SELECT policyname, cmd 
        FROM pg_policies 
        WHERE tablename = 'users' AND schemaname = 'public'
        ORDER BY policyname
    LOOP
        RAISE NOTICE '  ✓ % (for %)', policy_record.policyname, policy_record.cmd;
    END LOOP;
    
    IF policy_count = 4 THEN
        RAISE NOTICE '✓ SUCCESS: All 4 RLS policies created correctly';
    ELSE
        RAISE WARNING '⚠ Expected 4 policies, found %', policy_count;
    END IF;
    
    RAISE NOTICE '✓ Functions created with SET search_path (fixes security warnings)';
    RAISE NOTICE '✓ User registration should now work (INSERT policy added)';
    RAISE NOTICE '✓ Complete user cleanup available (both auth and public tables)';
END $$;

COMMIT;

-- ========================================
-- USAGE INSTRUCTIONS
-- ========================================

DO $$
BEGIN
    RAISE NOTICE '=== USAGE INSTRUCTIONS ===';
    RAISE NOTICE '';
    RAISE NOTICE '1. To see all users from both tables:';
    RAISE NOTICE '   SELECT * FROM dev_list_all_users_complete_secure();';
    RAISE NOTICE '';
    RAISE NOTICE '2. To check which users can login:';
    RAISE NOTICE '   SELECT * FROM dev_check_user_login_capability_secure();';
    RAISE NOTICE '';
    RAISE NOTICE '3. To remove ALL users except wellnickchin@gmail.com:';
    RAISE NOTICE '   SELECT dev_complete_user_cleanup_secure();';
    RAISE NOTICE '';
    RAISE NOTICE '4. Test user registration:';
    RAISE NOTICE '   - Try registering a new user through the frontend';
    RAISE NOTICE '   - Should no longer get RLS policy violation error';
    RAISE NOTICE '';
    RAISE NOTICE 'FIXES APPLIED:';
    RAISE NOTICE '✓ Added missing INSERT policy for user registration';
    RAISE NOTICE '✓ Fixed search_path security warnings in functions';
    RAISE NOTICE '✓ Comprehensive user cleanup (auth + public tables)';
    RAISE NOTICE '✓ Proper tenant isolation in RLS policies';
END $$;
