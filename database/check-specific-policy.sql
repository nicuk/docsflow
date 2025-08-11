-- CHECK IF THE SPECIFIC POLICY WE CREATED EXISTS
-- Run this to see if "tenant_complete_access" policy is actually deployed

-- 1. Check if our specific policy exists
SELECT 
    policyname as "Policy Name",
    cmd as "Command",
    permissive as "Permissive",
    roles as "Roles",
    qual as "USING Condition",
    with_check as "WITH CHECK Condition"
FROM pg_policies 
WHERE tablename = 'tenants' 
    AND schemaname = 'public'
    AND policyname = 'tenant_complete_access';

-- 2. If it doesn't exist, show ALL policies on tenants table
SELECT 
    'ALL POLICIES ON TENANTS:' as info,
    policyname,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'tenants' AND schemaname = 'public';

-- 3. Check if RLS is enabled
SELECT 
    'RLS STATUS:' as info,
    relrowsecurity as "RLS Enabled"
FROM pg_class 
WHERE relname = 'tenants' AND relnamespace = 'public'::regnamespace;

-- 4. Test the exact auth.role() function that should work
SELECT 
    'AUTH ROLE TEST:' as info,
    CASE 
        WHEN current_setting('request.jwt.claims', true)::json->>'role' = 'service_role' 
        THEN 'service_role detected'
        ELSE 'NOT service_role: ' || COALESCE(current_setting('request.jwt.claims', true)::json->>'role', 'null')
    END as role_status;
