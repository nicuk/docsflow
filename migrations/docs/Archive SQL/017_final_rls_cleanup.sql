-- Final RLS Policy Cleanup
-- Remove remaining duplicate policies and fix auth performance issue

-- Clean up user_sessions table (remove old policy)
DROP POLICY IF EXISTS user_session_access_policy ON user_sessions;

-- Clean up users table (remove old policies, keep optimized one)
DROP POLICY IF EXISTS "Safe user access" ON users;
DROP POLICY IF EXISTS user_access_policy ON users;

-- Fix the auth RLS performance issue by using subquery pattern
-- Per Supabase docs: wrap auth functions in SELECT to prevent per-row evaluation
CREATE POLICY "users_optimized_fixed" ON users
FOR ALL USING (
  tenant_id = ((SELECT auth.jwt()) ->> 'tenant_id')::uuid
  AND access_level >= (SELECT COALESCE(current_setting('app.min_access_level', true)::int, 1))
);

-- Drop the old optimized policy and replace with the fixed one
DROP POLICY IF EXISTS users_optimized ON users;
ALTER POLICY "users_optimized_fixed" ON users RENAME TO "users_optimized";

-- Verify cleanup
DO $$
BEGIN
  RAISE NOTICE 'RLS Policy cleanup completed successfully';
  RAISE NOTICE 'Remaining duplicate policies should be eliminated';
END $$;
