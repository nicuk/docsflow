-- FIX FUNCTION SECURITY WARNINGS
-- Addresses search_path security warnings for development functions
-- Issue: Functions don't have explicit search_path set, making them vulnerable to search_path attacks

BEGIN;

RAISE NOTICE 'Fixing function security warnings by setting explicit search_path';

-- ========================================
-- PART 1: UPDATE EXISTING DEV FUNCTIONS
-- ========================================

-- Fix dev_remove_user_safely function
CREATE OR REPLACE FUNCTION dev_remove_user_safely(user_email TEXT, tenant_subdomain TEXT DEFAULT NULL)
RETURNS TEXT 
LANGUAGE plpgsql
SECURITY DEFINER
-- FIX: Set explicit search_path to prevent security vulnerabilities
SET search_path = public, pg_temp
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

        -- Remove file uploads
        DELETE FROM file_uploads WHERE uploaded_by = target_user_id;
        GET DIAGNOSTICS affected_records = ROW_COUNT;
        RAISE NOTICE 'Removed % file uploads', affected_records;

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

-- Fix dev_remove_all_tenant_users function
CREATE OR REPLACE FUNCTION dev_remove_all_tenant_users(tenant_subdomain TEXT)
RETURNS TEXT 
LANGUAGE plpgsql
SECURITY DEFINER
-- FIX: Set explicit search_path to prevent security vulnerabilities
SET search_path = public, pg_temp
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

-- Fix dev_list_all_users function
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
-- FIX: Set explicit search_path to prevent security vulnerabilities
SET search_path = public, pg_temp
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

-- ========================================
-- PART 2: VERIFY SECURITY IMPROVEMENTS
-- ========================================

-- Check that functions now have proper search_path
SELECT 
    proname as function_name,
    prosecdef as security_definer,
    proconfig as function_config
FROM pg_proc 
WHERE proname IN ('dev_remove_user_safely', 'dev_remove_all_tenant_users', 'dev_list_all_users')
    AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

COMMIT;

-- ========================================
-- PART 3: USAGE INSTRUCTIONS
-- ========================================

-- Create helper function to show usage instructions
CREATE OR REPLACE FUNCTION dev_user_management_help()
RETURNS TEXT
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
    RETURN '
=== DEVELOPMENT USER MANAGEMENT FUNCTIONS ===

1. List all users:
   SELECT * FROM dev_list_all_users();

2. Remove a specific user (searches all tenants):
   SELECT dev_remove_user_safely(''user@example.com'');

3. Remove a user from specific tenant:
   SELECT dev_remove_user_safely(''user@example.com'', ''demo-tenant'');

4. Remove all users from a tenant:
   SELECT dev_remove_all_tenant_users(''demo-tenant'');

5. Get help:
   SELECT dev_user_management_help();

⚠️  WARNING: These functions are for DEVELOPMENT/TESTING only!
⚠️  DO NOT use in production without careful review!
';
END;
$$;

RAISE NOTICE 'Function security warnings fixed!';
RAISE NOTICE 'All dev functions now have explicit search_path set';
RAISE NOTICE 'Run: SELECT dev_user_management_help(); for usage instructions';