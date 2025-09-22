-- CORRECTED RLS POLICY DIAGNOSIS
-- Fixed for your PostgreSQL version

-- =============================================================================
-- STEP 1: Check what policies actually exist
-- =============================================================================

SELECT 
    'CURRENT POLICIES' as check_type,
    policyname,
    permissive,
    roles,
    cmd,
    qual IS NOT NULL as has_using_clause,
    with_check IS NOT NULL as has_with_check
FROM pg_policies 
WHERE tablename = 'chat_conversations'
ORDER BY policyname;

-- =============================================================================
-- STEP 2: Check if RLS is enabled (corrected query)
-- =============================================================================

SELECT 
    'RLS STATUS' as check_type,
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename = 'chat_conversations';

-- =============================================================================
-- STEP 3: Check if the user exists in public.users table
-- =============================================================================

SELECT 
    'USER EXISTENCE CHECK' as check_type,
    u.id,
    u.email,
    u.tenant_id,
    t.subdomain,
    u.tenant_id = '122928f6-f34e-484b-9a69-7e1f25caf45c' as matches_bitto_tenant
FROM users u
LEFT JOIN tenants t ON u.tenant_id = t.id
WHERE u.id = 'cc362aeb-bf97-4260-9dfb-bb172c9c202';

-- If no results, user doesn't exist in public.users
SELECT 
    'USER COUNT CHECK' as check_type,
    COUNT(*) as user_exists_in_public_users
FROM users
WHERE id = 'cc362aeb-bf97-4260-9dfb-bb172c9c202';

-- =============================================================================
-- STEP 4: Check auth.users vs public.users
-- =============================================================================

-- Check if user exists in auth.users but not public.users
SELECT 
    'AUTH VS PUBLIC USERS' as check_type,
    au.id as auth_user_id,
    au.email as auth_email,
    pu.id as public_user_id,
    pu.email as public_email,
    CASE 
        WHEN au.id IS NOT NULL AND pu.id IS NULL THEN 'USER MISSING FROM PUBLIC.USERS'
        WHEN au.id IS NOT NULL AND pu.id IS NOT NULL THEN 'USER EXISTS IN BOTH'
        ELSE 'USER NOT FOUND ANYWHERE'
    END as diagnosis
FROM auth.users au
FULL OUTER JOIN users pu ON au.id = pu.id
WHERE au.id = 'cc362aeb-bf97-4260-9dfb-bb172c9c202' 
   OR pu.id = 'cc362aeb-bf97-4260-9dfb-bb172c9c202';

-- =============================================================================
-- STEP 5: Test auth.uid() function
-- =============================================================================

-- Test if auth.uid() works at all
SELECT 
    'AUTH FUNCTION TEST' as check_type,
    auth.uid() as current_auth_uid,
    CASE 
        WHEN auth.uid() IS NULL THEN 'AUTH.UID() RETURNS NULL'
        ELSE 'AUTH.UID() WORKING'
    END as auth_status;

-- =============================================================================
-- STEP 6: Test the specific INSERT scenario
-- =============================================================================

-- Create a test transaction to see what fails
DO $$
DECLARE
    v_error_message TEXT;
    v_error_detail TEXT;
BEGIN
    -- Try the INSERT in a subtransaction
    BEGIN
        INSERT INTO chat_conversations (
            tenant_id,
            user_id,
            title,
            created_at,
            updated_at
        ) VALUES (
            '122928f6-f34e-484b-9a69-7e1f25caf45c',
            'cc362aeb-bf97-4260-9dfb-bb172c9c202',
            'Diagnostic Test Conversation',
            NOW(),
            NOW()
        );
        
        -- If we get here, it worked
        RAISE NOTICE 'SUCCESS: INSERT worked - rolling back test';
        ROLLBACK;
        
    EXCEPTION 
        WHEN insufficient_privilege THEN
            GET STACKED DIAGNOSTICS 
                v_error_message = MESSAGE_TEXT,
                v_error_detail = PG_EXCEPTION_DETAIL;
            RAISE NOTICE 'RLS POLICY ERROR: %', v_error_message;
            RAISE NOTICE 'DETAIL: %', COALESCE(v_error_detail, 'No additional details');
            
        WHEN OTHERS THEN
            GET STACKED DIAGNOSTICS 
                v_error_message = MESSAGE_TEXT,
                v_error_detail = PG_EXCEPTION_DETAIL;
            RAISE NOTICE 'OTHER ERROR: %', v_error_message;
            RAISE NOTICE 'DETAIL: %', COALESCE(v_error_detail, 'No additional details');
    END;
END;
$$;

-- =============================================================================
-- STEP 7: Check tenant validity
-- =============================================================================

SELECT 
    'TENANT CHECK' as check_type,
    id,
    subdomain,
    name,
    id = '122928f6-f34e-484b-9a69-7e1f25caf45c' as is_bitto_tenant
FROM tenants 
WHERE subdomain = 'bitto' OR id = '122928f6-f34e-484b-9a69-7e1f25caf45c';

-- =============================================================================
-- STEP 8: Final diagnosis
-- =============================================================================

SELECT 
    'FINAL DIAGNOSIS' as diagnosis_type,
    CASE 
        WHEN NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'chat_conversations')
        THEN 'ISSUE: No RLS policies exist for chat_conversations'
        
        WHEN NOT EXISTS (SELECT 1 FROM users WHERE id = 'cc362aeb-bf97-4260-9dfb-bb172c9c202')
        THEN 'ISSUE: User cc362aeb... does not exist in public.users table'
        
        WHEN NOT EXISTS (SELECT 1 FROM tenants WHERE id = '122928f6-f34e-484b-9a69-7e1f25caf45c')
        THEN 'ISSUE: Tenant 122928f6... does not exist in tenants table'
        
        WHEN EXISTS (SELECT 1 FROM users WHERE id = 'cc362aeb-bf97-4260-9dfb-bb172c9c202' AND tenant_id != '122928f6-f34e-484b-9a69-7e1f25caf45c')
        THEN 'ISSUE: User exists but belongs to different tenant'
        
        ELSE 'ISSUE: Policy logic problem - user and tenant exist but policy still blocks'
    END as likely_root_cause;
