-- ENHANCED USER TESTING UTILITIES
-- Safe utilities for development testing with email reuse
-- Addresses the need to reset/remove users safely for testing

BEGIN;

RAISE NOTICE 'Creating enhanced user testing utilities for email reuse';

-- ========================================
-- PART 1: QUICK EMAIL RESET FUNCTIONS
-- ========================================

-- Function to quickly reset a user for testing (keeps structure, clears data)
CREATE OR REPLACE FUNCTION dev_reset_user_for_testing(user_email TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    target_user_id UUID;
    result_message TEXT;
BEGIN
    -- Find the user
    SELECT id INTO target_user_id FROM users WHERE email = user_email;
    
    IF target_user_id IS NULL THEN
        RETURN 'ERROR: User not found with email: ' || user_email;
    END IF;

    -- Reset user data but keep the user record for testing
    BEGIN
        -- Clear sessions
        DELETE FROM user_sessions WHERE user_id = target_user_id;
        
        -- Clear notifications
        DELETE FROM notifications WHERE user_id = target_user_id;
        
        -- Clear API usage
        DELETE FROM api_usage WHERE user_id = target_user_id;
        
        -- Clear chat conversations
        DELETE FROM chat_conversations WHERE user_id = target_user_id;
        
        -- Clear analytics
        DELETE FROM analytics_events WHERE user_id = target_user_id;
        
        -- Reset last login
        UPDATE users SET last_login_at = NULL WHERE id = target_user_id;
        
        -- Reset auth user email confirmation if needed
        UPDATE auth.users SET 
            email_confirmed_at = NOW(),
            confirmed_at = NOW()
        WHERE id = target_user_id;
        
        result_message := 'SUCCESS: User ' || user_email || ' reset for testing (kept user record)';
        
    EXCEPTION WHEN OTHERS THEN
        result_message := 'ERROR: Failed to reset user ' || user_email || ': ' || SQLERRM;
    END;

    RETURN result_message;
END;
$$;

-- Function to completely clean slate for an email (removes everything)
CREATE OR REPLACE FUNCTION dev_clean_slate_email(user_email TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    result_message TEXT;
BEGIN
    -- Remove from public.users first (this should handle most cascades)
    DELETE FROM users WHERE email = user_email;
    
    -- Remove from auth.users (this handles auth-related cascades)
    DELETE FROM auth.users WHERE email = user_email;
    
    -- Clean up any orphaned invitations for this email
    DELETE FROM user_invitations WHERE email = user_email;
    
    result_message := 'SUCCESS: Email ' || user_email || ' completely cleaned - ready for fresh registration';
    
    RETURN result_message;
    
EXCEPTION WHEN OTHERS THEN
    RETURN 'ERROR: Failed to clean email ' || user_email || ': ' || SQLERRM;
END;
$$;

-- ========================================
-- PART 2: BATCH TESTING UTILITIES
-- ========================================

-- Function to reset all test users (emails containing 'test' or on specific domains)
CREATE OR REPLACE FUNCTION dev_reset_test_users()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    user_record RECORD;
    reset_count INTEGER := 0;
    result_message TEXT;
BEGIN
    -- Reset users with 'test' in email or common testing domains
    FOR user_record IN 
        SELECT email FROM users 
        WHERE email ILIKE '%test%' 
           OR email ILIKE '%@example.com'
           OR email ILIKE '%@test.com'
           OR email ILIKE '%+test@%'
    LOOP
        SELECT dev_clean_slate_email(user_record.email) INTO result_message;
        IF result_message LIKE 'SUCCESS%' THEN
            reset_count := reset_count + 1;
        END IF;
        RAISE NOTICE 'Reset: %', user_record.email;
    END LOOP;
    
    RETURN 'Reset ' || reset_count || ' test users';
END;
$$;

-- Function to create a test user with specific tenant
CREATE OR REPLACE FUNCTION dev_create_test_user(
    user_email TEXT,
    user_name TEXT,
    tenant_subdomain TEXT DEFAULT 'demo'
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    target_tenant_id UUID;
    new_user_id UUID;
    result_message TEXT;
BEGIN
    -- Find or create tenant
    SELECT id INTO target_tenant_id FROM tenants WHERE subdomain = tenant_subdomain;
    
    IF target_tenant_id IS NULL THEN
        -- Create demo tenant if it doesn't exist
        INSERT INTO tenants (subdomain, name, industry)
        VALUES (tenant_subdomain, 'Demo Tenant', 'general')
        RETURNING id INTO target_tenant_id;
    END IF;
    
    -- Clean any existing user with this email first
    PERFORM dev_clean_slate_email(user_email);
    
    -- Generate new UUID for user
    new_user_id := gen_random_uuid();
    
    -- Create auth user first
    INSERT INTO auth.users (
        id, 
        email, 
        encrypted_password, 
        email_confirmed_at, 
        confirmed_at,
        created_at,
        updated_at
    ) VALUES (
        new_user_id,
        user_email,
        crypt('password123', gen_salt('bf')), -- Default test password
        NOW(),
        NOW(),
        NOW(),
        NOW()
    );
    
    -- Create public user record
    INSERT INTO users (
        id,
        tenant_id,
        email,
        name,
        role,
        created_at
    ) VALUES (
        new_user_id,
        target_tenant_id,
        user_email,
        user_name,
        'user',
        NOW()
    );
    
    result_message := 'SUCCESS: Created test user ' || user_email || ' in tenant ' || tenant_subdomain || ' (password: password123)';
    
    RETURN result_message;
    
EXCEPTION WHEN OTHERS THEN
    RETURN 'ERROR: Failed to create test user ' || user_email || ': ' || SQLERRM;
END;
$$;

-- ========================================
-- PART 3: TESTING DASHBOARD FUNCTION
-- ========================================

-- Function to show current testing state
CREATE OR REPLACE FUNCTION dev_testing_dashboard()
RETURNS TABLE(
    category TEXT,
    count BIGINT,
    details TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        'Total Users'::TEXT,
        COUNT(*)::BIGINT,
        'Users in public.users table'::TEXT
    FROM users
    
    UNION ALL
    
    SELECT 
        'Auth Users'::TEXT,
        COUNT(*)::BIGINT,
        'Users in auth.users table'::TEXT
    FROM auth.users
    
    UNION ALL
    
    SELECT 
        'Test Users'::TEXT,
        COUNT(*)::BIGINT,
        'Users with test emails'::TEXT
    FROM users 
    WHERE email ILIKE '%test%' 
       OR email ILIKE '%@example.com'
       OR email ILIKE '%@test.com'
    
    UNION ALL
    
    SELECT 
        'Tenants'::TEXT,
        COUNT(*)::BIGINT,
        'Total tenants'::TEXT
    FROM tenants
    
    UNION ALL
    
    SELECT 
        'User Sessions'::TEXT,
        COUNT(*)::BIGINT,
        'Active user sessions'::TEXT
    FROM user_sessions
    WHERE is_active = true
    
    UNION ALL
    
    SELECT 
        'Pending Invitations'::TEXT,
        COUNT(*)::BIGINT,
        'Pending user invitations'::TEXT
    FROM user_invitations
    WHERE status = 'pending';
END;
$$;

COMMIT;

-- ========================================
-- PART 4: USAGE INSTRUCTIONS
-- ========================================

CREATE OR REPLACE FUNCTION dev_testing_help()
RETURNS TEXT
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
    RETURN '
=== DEVELOPMENT TESTING UTILITIES ===

📊 VIEW TESTING STATE:
   SELECT * FROM dev_testing_dashboard();

🧹 CLEAN EMAIL FOR REUSE:
   SELECT dev_clean_slate_email(''user@example.com'');

🔄 RESET USER (keep record, clear data):
   SELECT dev_reset_user_for_testing(''user@example.com'');

👥 RESET ALL TEST USERS:
   SELECT dev_reset_test_users();

✨ CREATE TEST USER:
   SELECT dev_create_test_user(''test@example.com'', ''Test User'', ''demo'');

📋 LIST ALL USERS:
   SELECT * FROM dev_list_all_users();

🚨 REMOVE USER COMPLETELY:
   SELECT dev_remove_user_safely(''user@example.com'');

⚠️  TESTING BEST PRACTICES:
   1. Use emails with "test" for easy cleanup
   2. Always check dashboard before/after operations
   3. Use clean_slate_email for fresh email registration
   4. Use reset_user_for_testing to keep structure

🔐 DEFAULT TEST PASSWORD: password123
';
END;
$$;

RAISE NOTICE 'Enhanced user testing utilities created!';
RAISE NOTICE 'Run: SELECT dev_testing_help(); for complete usage guide';
RAISE NOTICE 'Run: SELECT * FROM dev_testing_dashboard(); to see current state';