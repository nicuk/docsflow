-- VERIFY RLS POLICIES - Check for infinite recursion issues
-- Run this to verify that RLS policies are working correctly without recursion

-- 1. Check current policies on users table
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
WHERE tablename = 'users' 
ORDER BY policyname;

-- 2. Check if RLS is enabled
SELECT 
    schemaname,
    tablename,
    rowsecurity,
    forcerowsecurity
FROM pg_tables 
WHERE tablename = 'users';

-- 3. Test policy execution (this should NOT cause infinite recursion)
-- This query should work without errors if policies are correct
SELECT 'Policy test passed - no infinite recursion' as status
WHERE EXISTS (
    SELECT 1 FROM users LIMIT 1
);

-- 4. Check for any remaining problematic policies that might reference users table
SELECT 
    policyname,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'users' 
AND (
    qual LIKE '%users%' 
    OR with_check LIKE '%users%'
    OR qual LIKE '%tenant_id%'
    OR with_check LIKE '%tenant_id%'
);

-- 5. Verify auth.uid() function works
SELECT 
    'Auth function test: ' || COALESCE(auth.uid()::text, 'No authenticated user') as auth_status;
