-- Inspect current RLS policies to understand the linter issue
-- This will show us exactly what policies exist and their definitions

-- Show all RLS policies on the users table
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

-- Show all RLS policies on user_sessions table
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
WHERE tablename = 'user_sessions' 
ORDER BY policyname;

-- Show a summary of all tables with multiple policies
SELECT 
    tablename,
    COUNT(*) as policy_count,
    array_agg(policyname) as policy_names
FROM pg_policies 
WHERE schemaname = 'public'
GROUP BY tablename
HAVING COUNT(*) > 1
ORDER BY policy_count DESC, tablename;
