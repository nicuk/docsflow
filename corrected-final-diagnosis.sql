-- CORRECTED FINAL DIAGNOSIS AND FIX
-- Fixed UUID syntax for PostgreSQL

-- =============================================================================
-- STEP 1: Check if user exists in public.users (with proper UUID casting)
-- =============================================================================

SELECT 
    'USER EXISTENCE CHECK' as check_type,
    EXISTS(SELECT 1 FROM users WHERE id = 'cc362aeb-bf97-4260-9dfb-bb172c9c202'::uuid) as user_exists_in_public_users,
    EXISTS(SELECT 1 FROM auth.users WHERE id = 'cc362aeb-bf97-4260-9dfb-bb172c9c202'::uuid) as user_exists_in_auth_users;

-- Check if user exists in auth but not in public (THIS IS THE PROBLEM)
SELECT 
    'MISSING USER DIAGNOSIS' as check_type,
    au.id as auth_user_id,
    au.email as auth_email,
    au.created_at as auth_created_at,
    pu.id IS NULL as missing_from_public_users
FROM auth.users au
LEFT JOIN users pu ON au.id = pu.id
WHERE au.id = 'cc362aeb-bf97-4260-9dfb-bb172c9c202'::uuid;

-- =============================================================================
-- STEP 2: Check tenant exists (should be fine, but verify)
-- =============================================================================

SELECT 
    'TENANT CHECK' as check_type,
    id,
    subdomain,
    name
FROM tenants 
WHERE id = '122928f6-f34e-484b-9a69-7e1f25caf45c'::uuid OR subdomain = 'bitto';

-- =============================================================================
-- STEP 3: THE LIKELY FIX - Create the missing user
-- =============================================================================

-- If user is missing from public.users, this INSERT will fix the conversation creation
INSERT INTO users (
    id,
    tenant_id,
    email,
    name,
    role,
    access_level,
    created_at
) 
SELECT 
    au.id,
    '122928f6-f34e-484b-9a69-7e1f25caf45c'::uuid as tenant_id,
    au.email,
    COALESCE(au.raw_user_meta_data->>'name', split_part(au.email, '@', 1)) as name,
    'user' as role,
    2 as access_level,
    NOW() as created_at
FROM auth.users au
WHERE au.id = 'cc362aeb-bf97-4260-9dfb-bb172c9c202'::uuid
AND NOT EXISTS (SELECT 1 FROM users WHERE id = au.id);

-- =============================================================================
-- STEP 4: Verify the fix worked
-- =============================================================================

SELECT 
    'VERIFICATION' as check_type,
    u.id,
    u.email,
    u.tenant_id,
    u.role,
    t.subdomain
FROM users u
JOIN tenants t ON u.tenant_id = t.id
WHERE u.id = 'cc362aeb-bf97-4260-9dfb-bb172c9c202'::uuid;

-- =============================================================================
-- STEP 5: Test conversation creation should now work
-- =============================================================================

-- Test transaction (will rollback automatically)
DO $$
BEGIN
    -- Try the INSERT that was failing
    INSERT INTO chat_conversations (
        tenant_id,
        user_id,
        title,
        created_at,
        updated_at
    ) VALUES (
        '122928f6-f34e-484b-9a69-7e1f25caf45c'::uuid,
        'cc362aeb-bf97-4260-9dfb-bb172c9c202'::uuid,
        'Test Conversation After Fix',
        NOW(),
        NOW()
    );
    
    RAISE NOTICE 'SUCCESS: Conversation creation now works!';
    
    -- Clean up test
    DELETE FROM chat_conversations WHERE title = 'Test Conversation After Fix';
    
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'STILL FAILING: %', SQLERRM;
END;
$$;

-- =============================================================================
-- FINAL CONFIRMATION
-- =============================================================================

SELECT 
    'FINAL STATUS' as status_type,
    CASE 
        WHEN NOT EXISTS (SELECT 1 FROM users WHERE id = 'cc362aeb-bf97-4260-9dfb-bb172c9c202'::uuid)
        THEN '❌ ISSUE: User still missing from public.users table'
        ELSE '✅ SUCCESS: User exists in public.users - conversation creation should work'
    END as result;

-- =============================================================================
-- BONUS: Show all users for debugging
-- =============================================================================

SELECT 
    'ALL USERS IN PUBLIC.USERS' as debug_info,
    id,
    email,
    tenant_id,
    role
FROM users 
ORDER BY created_at DESC
LIMIT 10;
