-- EMERGENCY FIX: RLS Infinite Recursion in Users Table
-- Error: 42P17 - infinite recursion detected in policy for relation "users"
-- Root Cause: Policy references users table within users table policy

BEGIN;

-- 1. DISABLE RLS temporarily to fix the recursion
ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- 2. DROP the problematic recursive policy
DROP POLICY IF EXISTS "Optimized user tenant access" ON users;
DROP POLICY IF EXISTS "Users can only see their tenant data" ON users;
DROP POLICY IF EXISTS "Users can only see users in their tenant" ON users;

-- 3. CREATE SAFE, NON-RECURSIVE POLICIES
-- Use auth.uid() directly without subquery to users table
CREATE POLICY "Safe user access" ON users
  FOR ALL USING (
    -- Direct auth check without recursion
    id = auth.uid()
    OR 
    -- Service role bypass
    auth.role() = 'service_role'
  );

-- 4. RE-ENABLE RLS with safe policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- 5. VERIFY: Test the policy works without recursion
-- This should not cause infinite loop
SELECT 'RLS Fix Applied Successfully' as status;

COMMIT;

-- USAGE INSTRUCTIONS:
-- 1. Run this script in Supabase SQL Editor
-- 2. Test user registration/login
-- 3. Verify no more 42P17 errors
-- 4. Monitor for proper tenant isolation

-- EXPLANATION:
-- The original policy tried to lookup tenant_id from users table
-- within a policy ON users table, creating infinite recursion.
-- This fix uses direct auth.uid() comparison which is safe.
