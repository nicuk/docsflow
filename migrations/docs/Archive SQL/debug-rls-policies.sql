-- Debug current RLS policies on chat_conversations table
-- Check what's actually blocking the conversation creation

-- 1. Check if RLS is enabled
SELECT schemaname, tablename, rowsecurity, forcerlspolicy 
FROM pg_tables t
JOIN pg_class c ON c.relname = t.tablename
JOIN pg_namespace n ON n.oid = c.relnamespace AND n.nspname = t.schemaname
WHERE t.tablename = 'chat_conversations';

-- 2. List all policies on chat_conversations
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'chat_conversations'
ORDER BY policyname;

-- 3. Check current user context
SELECT 
    current_user as current_database_user,
    current_setting('request.jwt.claims', true) as jwt_claims,
    current_setting('request.jwt.claim.sub', true) as user_id,
    current_setting('request.jwt.claim.role', true) as user_role;

-- 4. Test INSERT as authenticated user with proper tenant context
-- This simulates what the API is trying to do
SET LOCAL request.jwt.claims = '{"sub": "cc362aeb-bf97-4260-9dfb-bb172c9c202", "role": "authenticated"}';
SET LOCAL request.jwt.claim.sub = 'cc362aeb-bf97-4260-9dfb-bb172c9c202';  
SET LOCAL request.jwt.claim.role = 'authenticated';

-- Test the INSERT that's failing
-- (This is a dry run - we'll use a transaction that we roll back)
BEGIN;
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
ROLLBACK;

-- 5. Check if the user exists in auth.users
SELECT id, email, created_at 
FROM auth.users 
WHERE id = 'cc362aeb-bf97-4260-9dfb-bb172c9c202'
LIMIT 1;
