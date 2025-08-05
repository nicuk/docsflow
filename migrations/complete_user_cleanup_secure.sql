-- COMPLETE USER CLEANUP: Remove ALL users except main account
-- This script removes users from BOTH public.users AND auth.users tables
-- WARNING: This will permanently delete all test users and their authentication records

-- First, let's create secure functions with proper search_path
CREATE OR REPLACE FUNCTION dev_complete_user_cleanup()
RETURNS TEXT 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    user_record RECORD;
    affected_records INTEGER := 0;
    total_public_users INTEGER := 0;
    total_auth_users INTEGER := 0;
    main_user_id UUID;
BEGIN
    -- Find the main user ID to preserve
    SELECT id INTO main_user_id 
    FROM auth.users 
    WHERE email = 'wellnickchin@gmail.com';
    
    IF main_user_id IS NULL THEN
        RAISE WARNING 'Main user wellnickchin@gmail.com not found in auth.users!';
    ELSE
        RAISE NOTICE 'Preserving main user: wellnickchin@gmail.com (ID: %)', main_user_id;
    END IF;

    -- Show what we're about to remove
    RAISE NOTICE '=== USERS TO BE REMOVED ===';
    
    -- List auth.users that will be removed
    RAISE NOTICE 'From auth.users:';
    FOR user_record IN 
        SELECT email, id 
        FROM auth.users 
        WHERE email != 'wellnickchin@gmail.com' OR email IS NULL
        ORDER BY email
    LOOP
        RAISE NOTICE '  - % (ID: %)', COALESCE(user_record.email, 'NO EMAIL'), user_record.id;
    END LOOP;
    
    -- List public.users that will be removed
    RAISE NOTICE 'From public.users:';
    FOR user_record IN 
        SELECT email, name, id 
        FROM public.users 
        WHERE email != 'wellnickchin@gmail.com'
        ORDER BY email
    LOOP
        RAISE NOTICE '  - % / % (ID: %)', user_record.email, COALESCE(user_record.name, 'NO NAME'), user_record.id;
    END LOOP;

    RAISE NOTICE '=== STARTING CLEANUP ===';

    -- STEP 1: Clean up related data for users that will be removed from public.users
    RAISE NOTICE 'Step 1: Cleaning related data...';
    
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

    -- Unassign leads (don't delete leads)
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

    -- STEP 2: Remove from public.users
    RAISE NOTICE 'Step 2: Removing from public.users...';
    DELETE FROM public.users WHERE email != 'wellnickchin@gmail.com';
    GET DIAGNOSTICS total_public_users = ROW_COUNT;
    RAISE NOTICE 'Removed % users from public.users', total_public_users;

    -- STEP 3: Remove from auth.users (this is the key step that was missing!)
    RAISE NOTICE 'Step 3: Removing from auth.users...';
    DELETE FROM auth.users 
    WHERE email != 'wellnickchin@gmail.com' OR email IS NULL;
    GET DIAGNOSTICS total_auth_users = ROW_COUNT;
    RAISE NOTICE 'Removed % users from auth.users', total_auth_users;

    -- Final verification
    RAISE NOTICE '=== CLEANUP COMPLETE ===';
    
    SELECT COUNT(*) INTO affected_records FROM public.users;
    RAISE NOTICE 'Remaining users in public.users: %', affected_records;
    
    SELECT COUNT(*) INTO affected_records FROM auth.users;
    RAISE NOTICE 'Remaining users in auth.users: %', affected_records;
    
    -- Show remaining users
    RAISE NOTICE 'Remaining users:';
    FOR user_record IN 
        SELECT email, name FROM public.users ORDER BY email 
    LOOP
        RAISE NOTICE '  public.users: % (%)', user_record.email, COALESCE(user_record.name, 'No name');
    END LOOP;
    
    FOR user_record IN 
        SELECT email FROM auth.users ORDER BY email 
    LOOP
        RAISE NOTICE '  auth.users: %', COALESCE(user_record.email, 'NO EMAIL');
    END LOOP;

    RETURN 'SUCCESS: Removed ' || total_public_users || ' from public.users and ' || total_auth_users || ' from auth.users';

EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'ERROR during cleanup: %', SQLERRM;
END;
$$;

-- Create a function to list all users from both tables (for debugging)
CREATE OR REPLACE FUNCTION dev_list_all_users_complete()
RETURNS TABLE(
    source TEXT,
    user_id UUID,
    email TEXT,
    name TEXT,
    created_at TIMESTAMPTZ
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        'public.users'::TEXT as source,
        u.id,
        u.email,
        u.name,
        u.created_at
    FROM public.users u
    UNION ALL
    SELECT 
        'auth.users'::TEXT as source,
        au.id,
        au.email,
        NULL::TEXT as name,
        au.created_at
    FROM auth.users au
    ORDER BY source, email;
END;
$$;

-- Create a function to check if test users can be used for login
CREATE OR REPLACE FUNCTION dev_check_test_user_login_capability()
RETURNS TABLE(
    email TEXT,
    has_auth_record BOOLEAN,
    has_public_record BOOLEAN,
    can_login BOOLEAN,
    tenant_subdomain TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
    RETURN QUERY
    WITH auth_users AS (
        SELECT au.email, au.id as auth_id
        FROM auth.users au
        WHERE au.email IS NOT NULL
    ),
    public_users AS (
        SELECT pu.email, pu.id as public_id, t.subdomain
        FROM public.users pu
        LEFT JOIN public.tenants t ON pu.tenant_id = t.id
    )
    SELECT 
        COALESCE(au.email, pu.email) as email,
        (au.auth_id IS NOT NULL) as has_auth_record,
        (pu.public_id IS NOT NULL) as has_public_record,
        (au.auth_id IS NOT NULL AND pu.public_id IS NOT NULL) as can_login,
        pu.subdomain as tenant_subdomain
    FROM auth_users au
    FULL OUTER JOIN public_users pu ON au.email = pu.email
    ORDER BY email;
END;
$$;

-- Instructions for use
DO $$
BEGIN
    RAISE NOTICE '=== COMPLETE USER CLEANUP FUNCTIONS CREATED ===';
    RAISE NOTICE '';
    RAISE NOTICE 'To see all users from both tables:';
    RAISE NOTICE '  SELECT * FROM dev_list_all_users_complete();';
    RAISE NOTICE '';
    RAISE NOTICE 'To check which test users can login:';
    RAISE NOTICE '  SELECT * FROM dev_check_test_user_login_capability();';
    RAISE NOTICE '';
    RAISE NOTICE 'To remove ALL users except wellnickchin@gmail.com:';
    RAISE NOTICE '  SELECT dev_complete_user_cleanup();';
    RAISE NOTICE '';
    RAISE NOTICE 'WARNING: The cleanup function will remove users from BOTH';
    RAISE NOTICE '         public.users AND auth.users tables!';
END $$;
