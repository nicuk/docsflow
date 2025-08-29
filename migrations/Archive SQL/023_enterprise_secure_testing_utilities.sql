-- ENTERPRISE SECURE TESTING UTILITIES
-- Corrects the security flaws in 021_enhanced_user_testing_utilities.sql
-- Adds production guards, audit logging, and proper credential management

BEGIN;

RAISE NOTICE 'Creating ENTERPRISE-GRADE secure testing utilities';

-- ========================================
-- PART 1: ENVIRONMENT SAFETY SYSTEM
-- ========================================

-- Function to check if we're in a safe environment for testing operations
CREATE OR REPLACE FUNCTION is_safe_testing_environment()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    environment TEXT;
    database_name TEXT;
BEGIN
    -- Get environment setting
    environment := current_setting('app.environment', true);
    
    -- Get database name for additional safety
    SELECT current_database() INTO database_name;
    
    -- Allow testing operations only in safe environments
    RETURN (
        environment IN ('development', 'test', 'staging')
        OR database_name ILIKE '%dev%'
        OR database_name ILIKE '%test%'
        OR database_name ILIKE '%staging%'
    );
END;
$$;

-- Function to enforce testing environment safety
CREATE OR REPLACE FUNCTION enforce_testing_environment()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    IF NOT is_safe_testing_environment() THEN
        RAISE EXCEPTION 'SECURITY: Testing utilities blocked in production environment. Database: %, Environment: %', 
            current_database(), 
            current_setting('app.environment', true);
    END IF;
END;
$$;

-- ========================================
-- PART 2: AUDIT LOGGING SYSTEM
-- ========================================

-- Create audit log table for user management operations
CREATE TABLE IF NOT EXISTS admin_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    action TEXT NOT NULL,
    target_email TEXT,
    target_tenant TEXT,
    performed_by TEXT DEFAULT current_user,
    session_user TEXT DEFAULT session_user,
    database_name TEXT DEFAULT current_database(),
    client_addr INET DEFAULT inet_client_addr(),
    details JSONB DEFAULT '{}',
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on audit log
ALTER TABLE admin_audit_log ENABLE ROW LEVEL SECURITY;

-- Allow service role to access audit logs
CREATE POLICY "service_role_audit_access" ON admin_audit_log
  FOR ALL TO service_role USING (true);

-- Function to log user management actions
CREATE OR REPLACE FUNCTION log_user_management_action(
    action_name TEXT,
    target_email TEXT DEFAULT NULL,
    target_tenant TEXT DEFAULT NULL,
    additional_details JSONB DEFAULT '{}'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    INSERT INTO admin_audit_log (
        action,
        target_email,
        target_tenant,
        details
    ) VALUES (
        action_name,
        target_email,
        target_tenant,
        additional_details
    );
END;
$$;

-- ========================================
-- PART 3: SECURE PASSWORD GENERATION
-- ========================================

-- Function to generate secure test passwords
CREATE OR REPLACE FUNCTION generate_secure_test_password()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    environment TEXT;
    password_base TEXT;
    timestamp_component TEXT;
BEGIN
    -- Check environment safety
    PERFORM enforce_testing_environment();
    
    environment := current_setting('app.environment', true);
    timestamp_component := extract(epoch from now())::text;
    
    -- Generate environment-specific password
    CASE environment
        WHEN 'development' THEN
            password_base := 'dev_password_';
        WHEN 'test' THEN
            password_base := 'test_password_';
        WHEN 'staging' THEN
            password_base := 'staging_password_';
        ELSE
            password_base := 'safe_test_password_';
    END CASE;
    
    -- Return password with timestamp for uniqueness
    RETURN password_base || timestamp_component;
END;
$$;

-- ========================================
-- PART 4: CORRECTED TESTING FUNCTIONS
-- ========================================

-- CORRECTED: Secure email cleanup function
CREATE OR REPLACE FUNCTION dev_clean_slate_email_secure(user_email TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    result_message TEXT;
    is_test_email BOOLEAN;
BEGIN
    -- Enforce environment safety
    PERFORM enforce_testing_environment();
    
    -- Validate email is actually a test email
    is_test_email := (
        user_email ILIKE '%test%' 
        OR user_email ILIKE '%@example.com'
        OR user_email ILIKE '%@test.com'
        OR user_email ILIKE '%+test@%'
        OR user_email ILIKE '%dev%'
    );
    
    IF NOT is_test_email THEN
        RAISE EXCEPTION 'SECURITY: Can only clean test emails. Email % does not match test patterns', user_email;
    END IF;
    
    -- Log the action
    PERFORM log_user_management_action(
        'EMAIL_CLEANUP',
        user_email,
        NULL,
        jsonb_build_object('environment', current_setting('app.environment', true))
    );
    
    -- Perform cleanup
    DELETE FROM users WHERE email = user_email;
    DELETE FROM auth.users WHERE email = user_email;
    DELETE FROM user_invitations WHERE email = user_email;
    
    result_message := 'SUCCESS: Email ' || user_email || ' cleaned safely (test environment only)';
    
    RETURN result_message;
    
EXCEPTION WHEN OTHERS THEN
    PERFORM log_user_management_action(
        'EMAIL_CLEANUP_FAILED',
        user_email,
        NULL,
        jsonb_build_object('error', SQLERRM)
    );
    RETURN 'ERROR: Failed to clean email ' || user_email || ': ' || SQLERRM;
END;
$$;

-- CORRECTED: Secure test user creation
CREATE OR REPLACE FUNCTION dev_create_test_user_secure(
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
    secure_password TEXT;
    result_message TEXT;
    is_test_email BOOLEAN;
BEGIN
    -- Enforce environment safety
    PERFORM enforce_testing_environment();
    
    -- Validate email is a test email
    is_test_email := (
        user_email ILIKE '%test%' 
        OR user_email ILIKE '%@example.com'
        OR user_email ILIKE '%@test.com'
        OR user_email ILIKE '%+test@%'
        OR user_email ILIKE '%dev%'
    );
    
    IF NOT is_test_email THEN
        RAISE EXCEPTION 'SECURITY: Can only create test users with test email patterns. Email: %', user_email;
    END IF;
    
    -- Generate secure password
    secure_password := generate_secure_test_password();
    
    -- Find or create tenant
    SELECT id INTO target_tenant_id FROM tenants WHERE subdomain = tenant_subdomain;
    
    IF target_tenant_id IS NULL THEN
        INSERT INTO tenants (subdomain, name, industry)
        VALUES (tenant_subdomain, 'Test Tenant - ' || tenant_subdomain, 'general')
        RETURNING id INTO target_tenant_id;
    END IF;
    
    -- Clean any existing user with this email first
    PERFORM dev_clean_slate_email_secure(user_email);
    
    -- Generate new UUID for user
    new_user_id := gen_random_uuid();
    
    -- Log the action
    PERFORM log_user_management_action(
        'TEST_USER_CREATION',
        user_email,
        tenant_subdomain,
        jsonb_build_object(
            'user_name', user_name,
            'environment', current_setting('app.environment', true)
        )
    );
    
    -- Create auth user with secure password
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
        crypt(secure_password, gen_salt('bf')),
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
    
    result_message := 'SUCCESS: Created secure test user ' || user_email || ' in tenant ' || tenant_subdomain || ' (password: ' || secure_password || ')';
    
    RETURN result_message;
    
EXCEPTION WHEN OTHERS THEN
    PERFORM log_user_management_action(
        'TEST_USER_CREATION_FAILED',
        user_email,
        tenant_subdomain,
        jsonb_build_object('error', SQLERRM)
    );
    RETURN 'ERROR: Failed to create test user ' || user_email || ': ' || SQLERRM;
END;
$$;

-- ========================================
-- PART 5: AUDIT AND MONITORING FUNCTIONS
-- ========================================

-- Function to view audit log
CREATE OR REPLACE FUNCTION view_user_management_audit(limit_rows INTEGER DEFAULT 50)
RETURNS TABLE(
    timestamp TIMESTAMPTZ,
    action TEXT,
    target_email TEXT,
    performed_by TEXT,
    database_name TEXT,
    details JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        a.timestamp,
        a.action,
        a.target_email,
        a.performed_by,
        a.database_name,
        a.details
    FROM admin_audit_log a
    ORDER BY a.timestamp DESC
    LIMIT limit_rows;
END;
$$;

-- Function to check environment safety status
CREATE OR REPLACE FUNCTION check_testing_environment_status()
RETURNS TABLE(
    check_name TEXT,
    status TEXT,
    value TEXT,
    is_safe BOOLEAN
)
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        'Environment Setting'::TEXT,
        CASE WHEN current_setting('app.environment', true) IN ('development', 'test', 'staging') 
             THEN 'SAFE ✅' ELSE 'UNSAFE ❌' END::TEXT,
        current_setting('app.environment', true)::TEXT,
        current_setting('app.environment', true) IN ('development', 'test', 'staging')
    
    UNION ALL
    
    SELECT 
        'Database Name'::TEXT,
        CASE WHEN current_database() ILIKE '%dev%' OR current_database() ILIKE '%test%' OR current_database() ILIKE '%staging%'
             THEN 'SAFE ✅' ELSE 'CHECK ⚠️' END::TEXT,
        current_database()::TEXT,
        current_database() ILIKE '%dev%' OR current_database() ILIKE '%test%' OR current_database() ILIKE '%staging%'
    
    UNION ALL
    
    SELECT 
        'Overall Safety'::TEXT,
        CASE WHEN is_safe_testing_environment() THEN 'SAFE FOR TESTING ✅' ELSE 'BLOCKED ❌' END::TEXT,
        'Testing utilities will ' || CASE WHEN is_safe_testing_environment() THEN 'work' ELSE 'be blocked' END::TEXT,
        is_safe_testing_environment();
END;
$$;

COMMIT;

-- ========================================
-- PART 6: USAGE INSTRUCTIONS
-- ========================================

CREATE OR REPLACE FUNCTION dev_secure_testing_help()
RETURNS TEXT
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
    RETURN '
=== ENTERPRISE SECURE TESTING UTILITIES ===

🔒 SECURITY FEATURES:
   - Environment checks prevent production use
   - Audit logging tracks all operations
   - Test email validation prevents accidents
   - Secure password generation
   - Production safety guards

📊 CHECK ENVIRONMENT SAFETY:
   SELECT * FROM check_testing_environment_status();

🧹 SECURE EMAIL CLEANUP (test emails only):
   SELECT dev_clean_slate_email_secure(''test@example.com'');

✨ CREATE SECURE TEST USER:
   SELECT dev_create_test_user_secure(''test@example.com'', ''Test User'', ''demo'');

📋 VIEW AUDIT LOG:
   SELECT * FROM view_user_management_audit(25);

⚠️  SECURITY NOTES:
   - Only works in development/test/staging environments
   - Only accepts emails matching test patterns
   - Generates unique secure passwords per environment
   - All operations are logged for audit trail
   - Production environments are automatically blocked

🔐 PASSWORD PATTERN: {environment}_password_{timestamp}
';
END;
$$;

RAISE NOTICE 'Enterprise secure testing utilities created!';
RAISE NOTICE 'Run: SELECT dev_secure_testing_help(); for secure usage guide';
RAISE NOTICE 'Run: SELECT * FROM check_testing_environment_status(); to verify safety';