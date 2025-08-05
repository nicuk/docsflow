-- NUCLEAR RESET: Complete User System Reset + Fix Login
-- Removes ALL users and fixes RLS policies to unblock registration/login
-- No accounts preserved - fresh start

BEGIN;

-- ========================================
-- PART 1: NUCLEAR USER CLEANUP
-- ========================================

RAISE NOTICE '=== NUCLEAR RESET: REMOVING ALL USERS ===';

-- Disable RLS temporarily for cleanup
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_usage DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_conversations DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.file_uploads DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_invitations DISABLE ROW LEVEL SECURITY;

RAISE NOTICE 'Disabled RLS for cleanup operations';

-- Remove ALL related data (no preservation)
DELETE FROM public.chat_messages;
DELETE FROM public.chat_conversations;
DELETE FROM public.user_sessions;
DELETE FROM public.notifications WHERE user_id IS NOT NULL;
DELETE FROM public.api_usage WHERE user_id IS NOT NULL;
DELETE FROM public.file_uploads WHERE uploaded_by IS NOT NULL;
DELETE FROM public.user_invitations;

-- Unassign all leads
UPDATE public.leads SET assigned_to = NULL WHERE assigned_to IS NOT NULL;

RAISE NOTICE 'Removed all user-related data';

-- Remove ALL users from public.users
DELETE FROM public.users;
RAISE NOTICE 'Removed all users from public.users';

-- Remove ALL users from auth.users (the nuclear option)
DELETE FROM auth.users;
RAISE NOTICE 'Removed all users from auth.users';

-- ========================================
-- PART 2: RESET RLS POLICIES FOR REGISTRATION
-- ========================================

RAISE NOTICE '=== RESETTING RLS POLICIES ===';

-- Re-enable RLS on users table
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies
DROP POLICY IF EXISTS "Users can only see users in their tenant" ON users;
DROP POLICY IF EXISTS "Users can update their own profile" ON users;
DROP POLICY IF EXISTS "Service role can manage all users" ON users;
DROP POLICY IF EXISTS "users_access_optimized" ON users;
DROP POLICY IF EXISTS "users_optimized_fixed" ON users;
DROP POLICY IF EXISTS "Optimized user tenant access" ON users;
DROP POLICY IF EXISTS "Safe user access" ON users;
DROP POLICY IF EXISTS "user_access_policy" ON users;
DROP POLICY IF EXISTS "Allow user registration" ON users;
DROP POLICY IF EXISTS "Users can see tenant users" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Service role can delete users" ON users;
DROP POLICY IF EXISTS "user_registration_policy" ON users;
DROP POLICY IF EXISTS "user_select_policy" ON users;
DROP POLICY IF EXISTS "user_update_policy" ON users;
DROP POLICY IF EXISTS "user_delete_policy" ON users;

RAISE NOTICE 'Dropped all existing RLS policies';

-- Create SIMPLE, PERMISSIVE policies for fresh start
-- Policy 1: Allow user registration (CRITICAL)
CREATE POLICY "allow_registration" ON users
  FOR INSERT 
  WITH CHECK (true);  -- Allow all inserts for now

-- Policy 2: Allow users to see their own data
CREATE POLICY "allow_own_select" ON users
  FOR SELECT USING (
    id = auth.uid() OR auth.role() = 'service_role'
  );

-- Policy 3: Allow users to update their own profile
CREATE POLICY "allow_own_update" ON users
  FOR UPDATE USING (
    id = auth.uid() OR auth.role() = 'service_role'
  );

-- Policy 4: Allow service role to delete
CREATE POLICY "allow_service_delete" ON users
  FOR DELETE USING (
    auth.role() = 'service_role'
  );

RAISE NOTICE 'Created 4 permissive RLS policies for fresh start';

-- ========================================
-- PART 3: RE-ENABLE RLS ON OTHER TABLES
-- ========================================

-- Re-enable RLS on other tables with permissive policies
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.file_uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_invitations ENABLE ROW LEVEL SECURITY;

-- Create simple policies for other tables
CREATE POLICY "user_sessions_policy" ON user_sessions
  FOR ALL USING (user_id = auth.uid() OR auth.role() = 'service_role');

CREATE POLICY "notifications_policy" ON notifications
  FOR ALL USING (user_id = auth.uid() OR auth.role() = 'service_role');

CREATE POLICY "api_usage_policy" ON api_usage
  FOR ALL USING (user_id = auth.uid() OR auth.role() = 'service_role');

CREATE POLICY "chat_conversations_policy" ON chat_conversations
  FOR ALL USING (user_id = auth.uid() OR auth.role() = 'service_role');

CREATE POLICY "chat_messages_policy" ON chat_messages
  FOR ALL USING (auth.role() = 'service_role' OR 
    conversation_id IN (SELECT id FROM chat_conversations WHERE user_id = auth.uid()));

CREATE POLICY "file_uploads_policy" ON file_uploads
  FOR ALL USING (uploaded_by = auth.uid() OR auth.role() = 'service_role');

CREATE POLICY "user_invitations_policy" ON user_invitations
  FOR ALL USING (auth.role() = 'service_role');

RAISE NOTICE 'Re-enabled RLS with permissive policies on all tables';

-- ========================================
-- PART 4: CREATE DIAGNOSTIC FUNCTIONS
-- ========================================

-- Function to check system state after reset
CREATE OR REPLACE FUNCTION dev_check_reset_status()
RETURNS TEXT 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    auth_count INTEGER;
    public_count INTEGER;
    policy_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO auth_count FROM auth.users;
    SELECT COUNT(*) INTO public_count FROM public.users;
    SELECT COUNT(*) INTO policy_count FROM pg_policies WHERE tablename = 'users' AND schemaname = 'public';
    
    RETURN 'RESET STATUS: auth.users=' || auth_count || ', public.users=' || public_count || ', policies=' || policy_count;
END;
$$;

-- Function to test registration capability
CREATE OR REPLACE FUNCTION dev_test_registration_ready()
RETURNS TEXT 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    insert_policy_exists BOOLEAN;
BEGIN
    SELECT EXISTS(
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'users' 
        AND schemaname = 'public' 
        AND cmd = 'INSERT'
    ) INTO insert_policy_exists;
    
    IF insert_policy_exists THEN
        RETURN 'REGISTRATION READY: INSERT policy exists, registration should work';
    ELSE
        RETURN 'REGISTRATION BLOCKED: No INSERT policy found';
    END IF;
END;
$$;

RAISE NOTICE 'Created diagnostic functions';

-- ========================================
-- PART 5: FINAL VERIFICATION
-- ========================================

DO $$
DECLARE
    result TEXT;
BEGIN
    RAISE NOTICE '=== NUCLEAR RESET COMPLETE ===';
    
    -- Check final state
    SELECT dev_check_reset_status() INTO result;
    RAISE NOTICE '%', result;
    
    SELECT dev_test_registration_ready() INTO result;
    RAISE NOTICE '%', result;
    
    RAISE NOTICE '';
    RAISE NOTICE 'WHAT WAS DONE:';
    RAISE NOTICE '✓ Removed ALL users from both auth.users and public.users';
    RAISE NOTICE '✓ Cleaned all related data (sessions, notifications, etc.)';
    RAISE NOTICE '✓ Reset RLS policies to be permissive for registration';
    RAISE NOTICE '✓ Created fresh INSERT policy to allow user registration';
    RAISE NOTICE '';
    RAISE NOTICE 'NEXT STEPS:';
    RAISE NOTICE '1. Try registering a new user through the frontend';
    RAISE NOTICE '2. Should no longer get RLS policy violation';
    RAISE NOTICE '3. Login should work after successful registration';
    RAISE NOTICE '';
    RAISE NOTICE 'SYSTEM IS NOW CLEAN AND READY FOR FRESH START!';
END $$;

COMMIT;

-- Final instructions
DO $$
BEGIN
    RAISE NOTICE '=== POST-RESET INSTRUCTIONS ===';
    RAISE NOTICE '';
    RAISE NOTICE 'To verify the reset worked:';
    RAISE NOTICE '  SELECT dev_check_reset_status();';
    RAISE NOTICE '  SELECT dev_test_registration_ready();';
    RAISE NOTICE '';
    RAISE NOTICE 'The system is now completely clean:';
    RAISE NOTICE '- No users in auth.users or public.users';
    RAISE NOTICE '- All user data removed';
    RAISE NOTICE '- RLS policies reset to allow registration';
    RAISE NOTICE '- Ready for fresh user registration and login';
END $$;
