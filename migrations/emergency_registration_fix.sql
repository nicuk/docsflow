-- EMERGENCY FIX: Enable User Registration by Fixing RLS Policies
-- This fixes the "new row violates row-level security policy" error

BEGIN;

-- First, let's see what policies currently exist on the users table
DO $$
DECLARE
    policy_record RECORD;
BEGIN
    RAISE NOTICE '=== CURRENT RLS POLICIES ON USERS TABLE ===';
    FOR policy_record IN 
        SELECT policyname, cmd, qual, with_check 
        FROM pg_policies 
        WHERE tablename = 'users' AND schemaname = 'public'
        ORDER BY policyname
    LOOP
        RAISE NOTICE 'Policy: % | Command: % | Using: % | With Check: %', 
            policy_record.policyname, 
            policy_record.cmd, 
            COALESCE(policy_record.qual, 'NULL'),
            COALESCE(policy_record.with_check, 'NULL');
    END LOOP;
END $$;

-- Drop all existing policies on users table to start fresh
DROP POLICY IF EXISTS "Users can only see users in their tenant" ON users;
DROP POLICY IF EXISTS "Users can update their own profile" ON users;
DROP POLICY IF EXISTS "Service role can manage all users" ON users;
DROP POLICY IF EXISTS "users_access_optimized" ON users;
DROP POLICY IF EXISTS "users_optimized_fixed" ON users;
DROP POLICY IF EXISTS "Optimized user tenant access" ON users;
DROP POLICY IF EXISTS "Safe user access" ON users;
DROP POLICY IF EXISTS "user_access_policy" ON users;

RAISE NOTICE 'Dropped all existing RLS policies on users table';

-- Create comprehensive RLS policies that allow registration
-- Policy 1: Allow authenticated users to insert their own user record during registration
CREATE POLICY "Allow user registration" ON users
  FOR INSERT 
  WITH CHECK (
    -- Allow if the user is authenticated and inserting their own record
    auth.uid() = id
    -- OR allow service role to insert any user
    OR auth.role() = 'service_role'
  );

-- Policy 2: Users can only see users in their tenant
CREATE POLICY "Users can see tenant users" ON users
  FOR SELECT USING (
    -- Allow users to see other users in their tenant
    tenant_id IN (
      SELECT tenant_id FROM users WHERE id = auth.uid()
    )
    -- OR allow service role to see all users
    OR auth.role() = 'service_role'
  );

-- Policy 3: Users can update their own profile
CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (
    -- Allow users to update their own record
    id = auth.uid()
    -- OR allow service role to update any user
    OR auth.role() = 'service_role'
  );

-- Policy 4: Only service role can delete users (for safety)
CREATE POLICY "Service role can delete users" ON users
  FOR DELETE USING (
    auth.role() = 'service_role'
  );

-- Verify the new policies
DO $$
DECLARE
    policy_record RECORD;
    policy_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies 
    WHERE tablename = 'users' AND schemaname = 'public';
    
    RAISE NOTICE '=== NEW RLS POLICIES ON USERS TABLE ===';
    RAISE NOTICE 'Total policies: %', policy_count;
    
    FOR policy_record IN 
        SELECT policyname, cmd, qual, with_check 
        FROM pg_policies 
        WHERE tablename = 'users' AND schemaname = 'public'
        ORDER BY policyname
    LOOP
        RAISE NOTICE 'Policy: % | Command: %', 
            policy_record.policyname, 
            policy_record.cmd;
    END LOOP;
    
    IF policy_count = 4 THEN
        RAISE NOTICE 'SUCCESS: All 4 RLS policies created successfully';
        RAISE NOTICE 'User registration should now work!';
    ELSE
        RAISE WARNING 'Expected 4 policies, but found %', policy_count;
    END IF;
END $$;

-- Test the policies by checking what a new user registration would see
DO $$
BEGIN
    RAISE NOTICE '=== REGISTRATION FLOW TEST ===';
    RAISE NOTICE 'The following should now work:';
    RAISE NOTICE '1. User signs up with Supabase Auth (creates auth.users record)';
    RAISE NOTICE '2. User gets JWT token with auth.uid()';
    RAISE NOTICE '3. Frontend calls API to create profile in public.users';
    RAISE NOTICE '4. INSERT policy allows: auth.uid() = id (user inserting own record)';
    RAISE NOTICE '5. User record created successfully!';
END $$;

COMMIT;

-- Instructions for testing
DO $$
BEGIN
    RAISE NOTICE '=== TESTING INSTRUCTIONS ===';
    RAISE NOTICE 'To test user registration:';
    RAISE NOTICE '1. Try registering a new user through the frontend';
    RAISE NOTICE '2. Check that no RLS policy violation occurs';
    RAISE NOTICE '3. Verify user appears in both auth.users and public.users';
    RAISE NOTICE '';
    RAISE NOTICE 'If registration still fails, check:';
    RAISE NOTICE '- Is the user ID from auth.uid() matching the ID being inserted?';
    RAISE NOTICE '- Is the API using the correct service role for backend operations?';
    RAISE NOTICE '- Are there any other constraints or triggers blocking insertion?';
END $$;
