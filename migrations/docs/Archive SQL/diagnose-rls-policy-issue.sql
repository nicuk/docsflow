-- DIAGNOSE RLS POLICY ISSUE
-- The conversation creation is still failing despite our "fixes"

-- =============================================================================
-- STEP 1: Check what policies actually exist
-- =============================================================================

SELECT 
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'chat_conversations'
ORDER BY policyname;

-- =============================================================================
-- STEP 2: Check if RLS is even enabled
-- =============================================================================

SELECT 
    schemaname,
    tablename,
    rowsecurity,
    forcerlspolicy
FROM pg_tables 
WHERE tablename = 'chat_conversations';

-- =============================================================================
-- STEP 3: Test the actual INSERT that's failing
-- =============================================================================

-- Simulate the exact context from the logs
SET LOCAL request.jwt.claims = '{"sub": "cc362aeb-bf97-4260-9dfb-bb172c9c202", "role": "authenticated", "company_name": "bitto"}';
SET LOCAL request.jwt.claim.sub = 'cc362aeb-bf97-4260-9dfb-bb172c9c202';
SET LOCAL request.jwt.claim.role = 'authenticated';
SET LOCAL request.jwt.claim.company_name = 'bitto';

-- Test what auth.uid() returns
SELECT 
    'AUTH CONTEXT TEST' as test_name,
    auth.uid() as auth_uid_result,
    current_setting('request.jwt.claim.sub', true) as jwt_sub,
    current_setting('request.jwt.claim.role', true) as jwt_role,
    current_setting('request.jwt.claim.company_name', true) as jwt_company;

-- =============================================================================
-- STEP 4: Check if user exists in the right tenant
-- =============================================================================

-- Check if user exists and belongs to bitto tenant
SELECT 
    'USER CHECK' as check_name,
    u.id,
    u.email,
    u.tenant_id,
    t.subdomain,
    u.tenant_id = '122928f6-f34e-484b-9a69-7e1f25caf45c' as matches_bitto_tenant
FROM users u
JOIN tenants t ON u.tenant_id = t.id
WHERE u.id = 'cc362aeb-bf97-4260-9dfb-bb172c9c202';

-- =============================================================================
-- STEP 5: Test the INSERT with explicit values
-- =============================================================================

-- Test what would happen with the actual INSERT
-- (This is a dry run - we'll use a transaction that we roll back)
BEGIN;

-- Try the INSERT that's failing
INSERT INTO chat_conversations (
    tenant_id,
    user_id,
    title,
    created_at,
    updated_at
) VALUES (
    '122928f6-f34e-484b-9a69-7e1f25caf45c',
    'cc362aeb-bf97-4260-9dfb-bb172c9c202',
    'Test Conversation',
    NOW(),
    NOW()
);

-- If we get here, the INSERT worked
SELECT 'INSERT TEST' as test_name, 'SUCCESS - INSERT worked' as result;

ROLLBACK;

-- =============================================================================
-- STEP 6: Check what's blocking the INSERT
-- =============================================================================

-- Test each policy condition individually
SELECT 
    'POLICY TEST 1' as test_name,
    'cc362aeb-bf97-4260-9dfb-bb172c9c202' = auth.uid() as user_id_matches_auth_uid,
    'cc362aeb-bf97-4260-9dfb-bb172c9c202' = (SELECT auth.uid()) as user_id_matches_subquery_auth_uid;

-- Test tenant lookup
SELECT 
    'POLICY TEST 2' as test_name,
    COUNT(*) as matching_tenants
FROM tenants t 
WHERE t.subdomain = current_setting('request.jwt.claim.company_name', true)
AND t.id = '122928f6-f34e-484b-9a69-7e1f25caf45c';

-- =============================================================================
-- STEP 7: Show complete diagnostic
-- =============================================================================

SELECT 
    'COMPLETE DIAGNOSIS' as diagnosis_type,
    CASE 
        WHEN NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'chat_conversations')
        THEN 'NO POLICIES EXIST - RLS blocking everything'
        WHEN auth.uid() IS NULL
        THEN 'AUTH.UID() IS NULL - user not authenticated properly'
        WHEN NOT EXISTS (SELECT 1 FROM users WHERE id = auth.uid())
        THEN 'USER DOES NOT EXIST in users table'
        ELSE 'POLICY LOGIC ISSUE - need to check policy conditions'
    END as likely_issue;
