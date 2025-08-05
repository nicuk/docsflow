-- DEVELOPMENT ONLY: Safe User Removal Script
-- WARNING: This script is for testing/development environments only
-- DO NOT run in production without careful review

-- Function to safely remove a user and all associated data
CREATE OR REPLACE FUNCTION dev_remove_user_safely(user_email TEXT, tenant_subdomain TEXT DEFAULT NULL)
RETURNS TEXT AS $$
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

        -- Remove chat conversations and messages
        DELETE FROM chat_messages WHERE conversation_id IN (
            SELECT id FROM chat_conversations WHERE user_id = target_user_id
        );
        GET DIAGNOSTICS affected_records = ROW_COUNT;
        RAISE NOTICE 'Removed % chat messages', affected_records;

        DELETE FROM chat_conversations WHERE user_id = target_user_id;
        GET DIAGNOSTICS affected_records = ROW_COUNT;
        RAISE NOTICE 'Removed % chat conversations', affected_records;

        -- Remove file uploads by this user
        DELETE FROM file_uploads WHERE uploaded_by = target_user_id;
        GET DIAGNOSTICS affected_records = ROW_COUNT;
        RAISE NOTICE 'Removed % file uploads', affected_records;

        -- Update leads assigned to this user (set to NULL instead of deleting)
        UPDATE leads SET assigned_to = NULL WHERE assigned_to = target_user_id;
        GET DIAGNOSTICS affected_records = ROW_COUNT;
        RAISE NOTICE 'Unassigned % leads from user', affected_records;

        -- Remove user invitations sent by this user
        DELETE FROM user_invitations WHERE invited_by = target_user_id;
        GET DIAGNOSTICS affected_records = ROW_COUNT;
        RAISE NOTICE 'Removed % user invitations sent by user', affected_records;

        -- Remove user invitations accepted by this user
        DELETE FROM user_invitations WHERE accepted_by = target_user_id;
        GET DIAGNOSTICS affected_records = ROW_COUNT;
        RAISE NOTICE 'Removed % user invitations accepted by user', affected_records;

        -- Finally, remove the user record
        DELETE FROM users WHERE id = target_user_id;
        GET DIAGNOSTICS affected_records = ROW_COUNT;
        
        IF affected_records = 1 THEN
            result_message := 'SUCCESS: User ' || user_email || ' and all associated data removed safely';
        ELSE
            result_message := 'ERROR: Failed to remove user record';
        END IF;

        RETURN result_message;

    EXCEPTION WHEN OTHERS THEN
        -- Rollback will happen automatically
        RETURN 'ERROR: Failed to remove user - ' || SQLERRM;
    END;
END;
$$ LANGUAGE plpgsql;

-- Function to remove all users from a specific tenant (for testing)
CREATE OR REPLACE FUNCTION dev_remove_all_tenant_users(tenant_subdomain TEXT)
RETURNS TEXT AS $$
DECLARE
    user_record RECORD;
    removal_result TEXT;
    total_removed INTEGER := 0;
BEGIN
    -- Find all users in the tenant
    FOR user_record IN 
        SELECT u.email 
        FROM users u 
        JOIN tenants t ON u.tenant_id = t.id 
        WHERE t.subdomain = tenant_subdomain
    LOOP
        -- Remove each user
        SELECT dev_remove_user_safely(user_record.email, tenant_subdomain) INTO removal_result;
        
        IF removal_result LIKE 'SUCCESS:%' THEN
            total_removed := total_removed + 1;
            RAISE NOTICE '%', removal_result;
        ELSE
            RAISE WARNING '%', removal_result;
        END IF;
    END LOOP;

    RETURN 'Removed ' || total_removed || ' users from tenant: ' || tenant_subdomain;
END;
$$ LANGUAGE plpgsql;

-- Function to list all users (for reference before removal)
CREATE OR REPLACE FUNCTION dev_list_all_users()
RETURNS TABLE(
    user_email TEXT,
    user_name TEXT,
    tenant_subdomain TEXT,
    user_role TEXT,
    created_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        u.email,
        u.name,
        t.subdomain,
        u.role,
        u.created_at
    FROM users u
    JOIN tenants t ON u.tenant_id = t.id
    ORDER BY t.subdomain, u.created_at;
END;
$$ LANGUAGE plpgsql;

-- Usage Examples:
-- 
-- 1. List all users first:
-- SELECT * FROM dev_list_all_users();
--
-- 2. Remove a specific user:
-- SELECT dev_remove_user_safely('user@example.com');
--
-- 3. Remove a user from specific tenant:
-- SELECT dev_remove_user_safely('user@example.com', 'demo-tenant');
--
-- 4. Remove all users from a tenant:
-- SELECT dev_remove_all_tenant_users('demo-tenant');
--
-- 5. Clean up functions when done:
-- DROP FUNCTION IF EXISTS dev_remove_user_safely(TEXT, TEXT);
-- DROP FUNCTION IF EXISTS dev_remove_all_tenant_users(TEXT);
-- DROP FUNCTION IF EXISTS dev_list_all_users();

-- Script completed successfully
-- Use the following functions:
-- dev_list_all_users() - to see all users before removal
-- dev_remove_user_safely(email) - to remove a specific user
-- dev_remove_all_tenant_users(subdomain) - to remove all users from a tenant
-- WARNING: These functions are for development/testing only!

DO $$
BEGIN
    RAISE NOTICE 'Development user removal functions created successfully';
    RAISE NOTICE 'Use dev_list_all_users() to see all users before removal';
    RAISE NOTICE 'Use dev_remove_user_safely(email) to remove a specific user';
    RAISE NOTICE 'WARNING: These functions are for development/testing only!';
END $$;
