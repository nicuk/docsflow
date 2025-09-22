-- SIMPLE USER FIX - No UUID casting issues
-- Using string comparison instead of UUID casting

-- =============================================================================
-- STEP 1: Check if user exists (using string comparison)
-- =============================================================================

-- Check users table directly
SELECT 
    'USERS TABLE CHECK' as check_type,
    COUNT(*) as total_users_in_public_table
FROM users;

-- Look for our specific user by converting UUID to text
SELECT 
    'SPECIFIC USER CHECK' as check_type,
    COUNT(*) as user_exists_count,
    CASE 
        WHEN COUNT(*) > 0 THEN 'User EXISTS in public.users'
        ELSE 'User MISSING from public.users' 
    END as diagnosis
FROM users 
WHERE id::text = 'cc362aeb-bf97-4260-9dfb-bb172c9c202';

-- =============================================================================
-- STEP 2: Check auth.users table
-- =============================================================================

-- Check if user exists in auth.users
SELECT 
    'AUTH USERS CHECK' as check_type,
    id::text as user_id,
    email,
    created_at
FROM auth.users 
WHERE id::text = 'cc362aeb-bf97-4260-9dfb-bb172c9c202';

-- =============================================================================
-- STEP 3: Check tenant exists
-- =============================================================================

SELECT 
    'TENANT CHECK' as check_type,
    id::text as tenant_id,
    subdomain,
    name
FROM tenants 
WHERE id::text = '122928f6-f34e-484b-9a69-7e1f25caf45c' OR subdomain = 'bitto';

-- =============================================================================
-- STEP 4: Simple fix - Create the user if missing
-- =============================================================================

-- Create the user in public.users if they don't exist
INSERT INTO users (
    id,
    tenant_id,
    email,
    name,
    role,
    access_level
)
SELECT 
    au.id,
    t.id as tenant_id,
    au.email,
    COALESCE(au.raw_user_meta_data->>'name', 'Support User') as name,
    'user' as role,
    2 as access_level
FROM auth.users au
CROSS JOIN tenants t
WHERE au.id::text = 'cc362aeb-bf97-4260-9dfb-bb172c9c202'
AND t.subdomain = 'bitto'
AND NOT EXISTS (
    SELECT 1 FROM users 
    WHERE id::text = 'cc362aeb-bf97-4260-9dfb-bb172c9c202'
);

-- =============================================================================
-- STEP 5: Verify the user was created
-- =============================================================================

SELECT 
    'VERIFICATION AFTER FIX' as check_type,
    u.id::text as user_id,
    u.email,
    u.tenant_id::text as tenant_id,
    u.role,
    t.subdomain
FROM users u
JOIN tenants t ON u.tenant_id = t.id
WHERE u.id::text = 'cc362aeb-bf97-4260-9dfb-bb172c9c202';

-- =============================================================================
-- STEP 6: Test conversation creation
-- =============================================================================

-- Simple test insert
INSERT INTO chat_conversations (
    tenant_id,
    user_id,
    title
)
SELECT 
    u.tenant_id,
    u.id,
    'Test Conversation - Fixed'
FROM users u
WHERE u.id::text = 'cc362aeb-bf97-4260-9dfb-bb172c9c202'
LIMIT 1;

-- Check if it worked
SELECT 
    'CONVERSATION TEST' as check_type,
    COUNT(*) as conversations_created,
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ SUCCESS: Conversation creation now works!'
        ELSE '❌ FAILED: Still having issues'
    END as result
FROM chat_conversations 
WHERE title = 'Test Conversation - Fixed';

-- Clean up test conversation
DELETE FROM chat_conversations WHERE title = 'Test Conversation - Fixed';

-- =============================================================================
-- FINAL STATUS
-- =============================================================================

SELECT 
    'FINAL DIAGNOSIS' as status_type,
    CASE 
        WHEN EXISTS (SELECT 1 FROM users WHERE id::text = 'cc362aeb-bf97-4260-9dfb-bb172c9c202')
        THEN '✅ SUCCESS: User now exists in public.users - try creating conversation in your app!'
        ELSE '❌ ISSUE: User still missing - check the error logs above'
    END as final_result;
