-- SUPABASE RLS FIX: Run this in Supabase SQL Editor
-- Fixes the "new row violates row-level security policy" error

-- Step 1: Drop all existing policies on users table
DROP POLICY IF EXISTS "Users can only see users in their tenant" ON public.users;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;
DROP POLICY IF EXISTS "Service role can manage all users" ON public.users;
DROP POLICY IF EXISTS "users_access_optimized" ON public.users;
DROP POLICY IF EXISTS "users_optimized_fixed" ON public.users;
DROP POLICY IF EXISTS "Optimized user tenant access" ON public.users;
DROP POLICY IF EXISTS "Safe user access" ON public.users;
DROP POLICY IF EXISTS "user_access_policy" ON public.users;

-- Step 2: Create the missing INSERT policy (this is what's blocking registration!)
CREATE POLICY "allow_user_registration" ON public.users
  FOR INSERT 
  WITH CHECK (
    -- Allow users to insert their own record during registration
    auth.uid() = id
  );

-- Step 3: Create basic SELECT policy
CREATE POLICY "allow_user_select" ON public.users
  FOR SELECT USING (
    -- Users can see their own record
    auth.uid() = id
    -- Service role can see all
    OR auth.role() = 'service_role'
  );

-- Step 4: Create basic UPDATE policy  
CREATE POLICY "allow_user_update" ON public.users
  FOR UPDATE USING (
    -- Users can update their own record
    auth.uid() = id
    -- Service role can update all
    OR auth.role() = 'service_role'
  );

-- Step 5: Verify the fix
SELECT 
  policyname, 
  cmd,
  CASE 
    WHEN cmd = 'INSERT' THEN 'REGISTRATION ENABLED ✓'
    WHEN cmd = 'SELECT' THEN 'USER DATA ACCESS ✓'
    WHEN cmd = 'UPDATE' THEN 'PROFILE UPDATES ✓'
    ELSE 'OTHER'
  END as status
FROM pg_policies 
WHERE tablename = 'users' AND schemaname = 'public'
ORDER BY cmd;
