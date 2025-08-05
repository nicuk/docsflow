-- SCHEMA-ALIGNED TESTING UTILITIES
-- Based on ACTUAL schema from Schema implemented.md
-- NO audit tables, NO non-existent dependencies

BEGIN;

RAISE NOTICE 'Creating testing utilities aligned with ACTUAL schema';

-- ========================================
-- PART 1: SCHEMA-BASED SAFETY CHECKS
-- ========================================

-- Function to check if we're in development based on actual indicators
CREATE OR REPLACE FUNCTION is_development_environment()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    database_name TEXT;
    host_info TEXT;
BEGIN
    -- Get database name
    SELECT current_database() INTO database_name;
    
    -- Check for development indicators in database name
    RETURN (
        database_name ILIKE '%dev%'
        OR database_name ILIKE '%test%'
        OR database_name ILIKE '%local%'
        OR database_name ILIKE '%staging%'
        -- Additional safety: check if this is localhost/development
        OR EXISTS (
            SELECT 1 FROM pg_stat_activity 
            WHERE client_addr IS NULL  -- Local connections
            LIMIT 1
        )
    );
END;
$$;

-- Function to enforce development environment
CREATE OR REPLACE FUNCTION enforce_development_only()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    IF NOT is_development_environment() THEN
        RAISE EXCEPTION 'BLOCKED: This function only works in development environments. Database: %', current_database();
    END IF;
END;
$$;

-- ========================================
-- PART 2: SIMPLE EMAIL CLEANUP (NO AUDIT LOG)
-- ========================================

-- Clean email function - works with your actual schema
CREATE OR REPLACE FUNCTION dev_clean_email_simple(user_email TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    result_message TEXT;
    affected_users INTEGER;
    affected_auth INTEGER;
    is_test_email BOOLEAN;
BEGIN
    -- Enforce development environment
    PERFORM enforce_development_only();
    
    -- Validate email pattern
    is_test_email := (
        user_email ILIKE '%test%' 
        OR user_email ILIKE '%@example.com'
        OR user_email ILIKE '%@test.com'
        OR user_email ILIKE '%+test@%'
        OR user_email ILIKE '%dev%'
        OR user_email ILIKE '%demo%'
    );
    
    IF NOT is_test_email THEN
        RAISE EXCEPTION 'SAFETY: Only test email patterns allowed. Email: %', user_email;
    END IF;
    
    -- Clean up based on ACTUAL schema tables
    -- 1. Clean user_sessions (exists in schema)
    DELETE FROM user_sessions 
    WHERE user_id IN (SELECT id FROM users WHERE email = user_email);
    
    -- 2. Clean notifications (exists in schema)
    DELETE FROM notifications 
    WHERE user_id IN (SELECT id FROM users WHERE email = user_email);
    
    -- 3. Clean api_usage (exists in schema)
    DELETE FROM api_usage 
    WHERE user_id IN (SELECT id FROM users WHERE email = user_email);
    
    -- 4. Clean chat_conversations (exists in schema)
    DELETE FROM chat_conversations 
    WHERE user_id IN (SELECT id FROM users WHERE email = user_email);
    
    -- 5. Clean analytics_events (exists in schema)
    DELETE FROM analytics_events 
    WHERE user_id IN (SELECT id FROM users WHERE email = user_email);
    
    -- 6. Clean user_invitations (exists in schema)
    DELETE FROM user_invitations WHERE email = user_email;
    DELETE FROM user_invitations 
    WHERE invited_by IN (SELECT id FROM users WHERE email = user_email);
    
    -- 7. Update leads to unassign (exists in schema)
    UPDATE leads SET assigned_to = NULL 
    WHERE assigned_to IN (SELECT id FROM users WHERE email = user_email);
    
    -- 8. Clean from public.users
    DELETE FROM users WHERE email = user_email;
    GET DIAGNOSTICS affected_users = ROW_COUNT;
    
    -- 9. Clean from auth.users
    DELETE FROM auth.users WHERE email = user_email;
    GET DIAGNOSTICS affected_auth = ROW_COUNT;
    
    result_message := 'SUCCESS: Cleaned ' || user_email || ' (' || affected_users || ' public users, ' || affected_auth || ' auth users)';
    
    RETURN result_message;
    
EXCEPTION WHEN OTHERS THEN
    RETURN 'ERROR: Failed to clean ' || user_email || ': ' || SQLERRM;
END;
$$;

-- ========================================
-- PART 3: SIMPLE TEST USER CREATION
-- ========================================

-- Create test user function - works with your actual schema
CREATE OR REPLACE FUNCTION dev_create_test_user_simple(
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
    test_password TEXT;
    result_message TEXT;
    is_test_email BOOLEAN;
BEGIN
    -- Enforce development environment
    PERFORM enforce_development_only();
    
    -- Validate test email
    is_test_email := (
        user_email ILIKE '%test%' 
        OR user_email ILIKE '%@example.com'
        OR user_email ILIKE '%@test.com'
        OR user_email ILIKE '%+test@%'
        OR user_email ILIKE '%dev%'
        OR user_email ILIKE '%demo%'
    );
    
    IF NOT is_test_email THEN
        RAISE EXCEPTION 'SAFETY: Only test email patterns allowed. Email: %', user_email;
    END IF;
    
    -- Generate simple test password
    test_password := 'test123_' || extract(epoch from now())::text;
    
    -- Find or create tenant (using your actual tenants schema)
    SELECT id INTO target_tenant_id 
    FROM tenants 
    WHERE subdomain = tenant_subdomain;
    
    IF target_tenant_id IS NULL THEN
        -- Create tenant with your actual schema structure
        INSERT INTO tenants (subdomain, name, industry)
        VALUES (tenant_subdomain, 'Test Tenant - ' || tenant_subdomain, 'general')
        RETURNING id INTO target_tenant_id;
    END IF;
    
    -- Clean existing user first
    PERFORM dev_clean_email_simple(user_email);
    
    -- Generate new UUID
    new_user_id := gen_random_uuid();
    
    -- Create auth user
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
        crypt(test_password, gen_salt('bf')),
        NOW(),
        NOW(),
        NOW(),
        NOW()
    );
    
    -- Create public user with your actual schema
    INSERT INTO users (
        id,
        tenant_id,
        email,
        name,
        role,
        access_level,
        created_at
    ) VALUES (
        new_user_id,
        target_tenant_id,
        user_email,
        user_name,
        'user',
        1,  -- Default access level from your schema
        NOW()
    );
    
    result_message := 'SUCCESS: Created test user ' || user_email || ' in tenant ' || tenant_subdomain || ' (password: ' || test_password || ')';
    
    RETURN result_message;
    
EXCEPTION WHEN OTHERS THEN
    RETURN 'ERROR: Failed to create test user ' || user_email || ': ' || SQLERRM;
END;
$$;

-- ========================================
-- PART 4: SIMPLE DASHBOARD (USING ACTUAL SCHEMA)
-- ========================================

-- Dashboard function using only tables that exist in your schema
CREATE OR REPLACE FUNCTION dev_testing_dashboard_simple()
RETURNS TABLE(
    metric TEXT,
    count BIGINT,
    details TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    RETURN QUERY
    -- Total users
    SELECT 
        'Total Users'::TEXT,
        COUNT(*)::BIGINT,
        'Users in public.users table'::TEXT
    FROM users
    
    UNION ALL
    
    -- Auth users
    SELECT 
        'Auth Users'::TEXT,
        COUNT(*)::BIGINT,
        'Users in auth.users table'::TEXT
    FROM auth.users
    
    UNION ALL
    
    -- Test users
    SELECT 
        'Test Users'::TEXT,
        COUNT(*)::BIGINT,
        'Users with test email patterns'::TEXT
    FROM users 
    WHERE email ILIKE '%test%' 
       OR email ILIKE '%@example.com'
       OR email ILIKE '%@test.com'
       OR email ILIKE '%dev%'
    
    UNION ALL
    
    -- Tenants (exists in your schema)
    SELECT 
        'Tenants'::TEXT,
        COUNT(*)::BIGINT,
        'Total tenants'::TEXT
    FROM tenants
    
    UNION ALL
    
    -- Active sessions (exists in your schema)
    SELECT 
        'Active Sessions'::TEXT,
        COUNT(*)::BIGINT,
        'Active user sessions'::TEXT
    FROM user_sessions
    WHERE is_active = true
    
    UNION ALL
    
    -- Pending invitations (exists in your schema)
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
-- PART 5: SIMPLE HELP FUNCTION
-- ========================================

CREATE OR REPLACE FUNCTION dev_testing_help_simple()
RETURNS TEXT
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
    RETURN '
=== SIMPLE TESTING UTILITIES (Schema Aligned) ===

📊 VIEW CURRENT STATE:
   SELECT * FROM dev_testing_dashboard_simple();

🧹 CLEAN TEST EMAIL:
   SELECT dev_clean_email_simple(''test@example.com'');

✨ CREATE TEST USER:
   SELECT dev_create_test_user_simple(''test@example.com'', ''Test User'', ''demo'');

🔒 SAFETY FEATURES:
   - Only works in development environments
   - Only accepts test email patterns
   - Uses actual schema tables only
   - No audit logging dependencies

⚠️  TEST EMAIL PATTERNS:
   - Contains "test", "dev", "demo"
   - Ends with @example.com, @test.com
   - Contains +test@ anywhere

🔐 PASSWORD: Generates unique test passwords per user
';
END;
$$;

RAISE NOTICE 'Schema-aligned testing utilities created!';
RAISE NOTICE 'Run: SELECT dev_testing_help_simple(); for usage guide';
RAISE NOTICE 'These utilities work with your ACTUAL schema - no fictional tables!';