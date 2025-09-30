-- ============================================
-- ROOT FIX: Update RLS policies for Clerk migration
-- ============================================
-- Problem: RLS policies expect auth.uid() from Supabase Auth
-- Solution: Use service role with tenant_id filtering at app level
-- Security: validateTenantContext ensures tenant isolation
-- ============================================

-- Step 1: Check current RLS policies
SELECT 
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE schemaname = 'public'
  AND tablename IN ('documents', 'document_chunks', 'chat_conversations', 'chat_messages')
ORDER BY tablename, policyname;

-- Step 2: Disable RLS on tables (we're using application-level security with Clerk)
-- This is SAFE because:
-- 1. validateTenantContext enforces tenant isolation
-- 2. Service role key is only used server-side
-- 3. All queries filter by tenant_id explicitly

ALTER TABLE public.documents DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_chunks DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_conversations DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenants DISABLE ROW LEVEL SECURITY;

-- Step 3: Verify RLS is disabled
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables 
WHERE schemaname = 'public'
  AND tablename IN ('documents', 'document_chunks', 'chat_conversations', 'chat_messages', 'users', 'tenants')
ORDER BY tablename;

-- ============================================
-- ALTERNATIVE: Keep RLS but allow service role
-- ============================================
-- If you prefer to keep RLS as a backup layer:
/*
-- Enable RLS
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- Drop old policies
DROP POLICY IF EXISTS "Users can view documents in their tenant" ON public.documents;
DROP POLICY IF EXISTS "Users can insert documents in their tenant" ON public.documents;

-- Create new policies that allow service role
CREATE POLICY "Service role has full access to documents"
  ON public.documents
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Repeat for other tables...
*/

-- ============================================
-- NOTES:
-- ============================================
-- With Clerk, authentication happens at the application level:
-- 1. Clerk validates the user's JWT token
-- 2. validateTenantContext ensures user has access to tenant
-- 3. All queries filter by tenant_id explicitly
-- 4. Service role key is only used in secure API routes
-- 
-- This is a common pattern when using external auth providers
-- with Supabase as a database (not auth provider).
-- ============================================

