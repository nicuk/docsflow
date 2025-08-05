-- RLS Diagnostic and Final Fix
-- This script will diagnose the current state and apply the correct fix

-- First, let's see what policies currently exist
DO $$
DECLARE
    policy_record RECORD;
BEGIN
    RAISE NOTICE '=== CURRENT RLS POLICIES ON USERS TABLE ===';
    FOR policy_record IN 
        SELECT policyname, qual 
        FROM pg_policies 
        WHERE tablename = 'users' AND schemaname = 'public'
        ORDER BY policyname
    LOOP
        RAISE NOTICE 'Policy: % | Definition: %', policy_record.policyname, policy_record.qual;
    END LOOP;
END $$;

-- Remove ALL existing policies on users table to start clean
DROP POLICY IF EXISTS "Safe user access" ON users;
DROP POLICY IF EXISTS user_access_policy ON users;
DROP POLICY IF EXISTS users_optimized ON users;
DROP POLICY IF EXISTS users_optimized_fixed ON users;

-- Remove duplicate policy on user_sessions
DROP POLICY IF EXISTS user_session_access_policy ON user_sessions;

-- Create the properly optimized RLS policy for users
-- Using the exact pattern recommended by Supabase docs
CREATE POLICY "users_access_optimized" ON users
FOR ALL USING (
  tenant_id = ((SELECT auth.jwt()) ->> 'tenant_id')::uuid
  AND access_level >= COALESCE((SELECT current_setting('app.min_access_level', true))::int, 1)
);

-- Verify the new policy was created
DO $$
DECLARE
    policy_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies 
    WHERE tablename = 'users' AND schemaname = 'public';
    
    RAISE NOTICE '=== VERIFICATION ===';
    RAISE NOTICE 'Users table now has % RLS policies', policy_count;
    
    IF policy_count = 1 THEN
        RAISE NOTICE 'SUCCESS: Only one RLS policy remains on users table';
    ELSE
        RAISE WARNING 'WARNING: Users table still has multiple policies';
    END IF;
END $$;

-- Show final state
DO $$
DECLARE
    policy_record RECORD;
BEGIN
    RAISE NOTICE '=== FINAL RLS POLICIES ON USERS TABLE ===';
    FOR policy_record IN 
        SELECT policyname, qual 
        FROM pg_policies 
        WHERE tablename = 'users' AND schemaname = 'public'
        ORDER BY policyname
    LOOP
        RAISE NOTICE 'Policy: % | Definition: %', policy_record.policyname, policy_record.qual;
    END LOOP;
END $$;
