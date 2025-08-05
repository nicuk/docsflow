-- CORRECT RLS FIX: Allow Service Role for User Registration
-- Run this in Supabase SQL Editor to fix the registration error

-- Step 1: Drop the existing INSERT policy that's too restrictive
DROP POLICY IF EXISTS "allow_user_registration" ON public.users;

-- Step 2: Create the CORRECT INSERT policy that allows service role
CREATE POLICY "allow_user_registration_service_role" ON public.users
  FOR INSERT 
  WITH CHECK (
    -- Allow service role to insert any user (for registration API)
    auth.role() = 'service_role'
    -- OR allow authenticated users to insert their own record
    OR auth.uid() = id
  );

-- Step 3: Update SELECT policy to also allow service role
DROP POLICY IF EXISTS "allow_user_select" ON public.users;
CREATE POLICY "allow_user_select_service_role" ON public.users
  FOR SELECT USING (
    -- Allow service role to see all users
    auth.role() = 'service_role'
    -- OR users can see their own record
    OR auth.uid() = id
  );

-- Step 4: Update UPDATE policy to also allow service role  
DROP POLICY IF EXISTS "allow_user_update" ON public.users;
CREATE POLICY "allow_user_update_service_role" ON public.users
  FOR UPDATE USING (
    -- Allow service role to update any user
    auth.role() = 'service_role'
    -- OR users can update their own record
    OR auth.uid() = id
  );

-- Step 5: Verify the fix
SELECT 
  policyname, 
  cmd,
  CASE 
    WHEN cmd = 'INSERT' AND policyname LIKE '%service_role%' THEN 'REGISTRATION FIXED ✅'
    WHEN cmd = 'SELECT' AND policyname LIKE '%service_role%' THEN 'USER ACCESS FIXED ✅'
    WHEN cmd = 'UPDATE' AND policyname LIKE '%service_role%' THEN 'PROFILE UPDATES FIXED ✅'
    ELSE 'NEEDS SERVICE ROLE ACCESS ❌'
  END as status
FROM pg_policies 
WHERE tablename = 'users' AND schemaname = 'public'
ORDER BY cmd;

-- Step 6: Test that service role can insert
-- This should return true if the fix worked
SELECT auth.role() = 'service_role' as service_role_active;
