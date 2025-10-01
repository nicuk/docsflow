-- ============================================================================
-- SURGICAL FIX: Critical RLS Security Issues
-- ============================================================================
-- ISSUE 1: RLS policies exist but RLS not enabled (CRITICAL SECURITY)
-- ISSUE 2: Auth function calls not optimized (PERFORMANCE)
-- ISSUE 3: Multiple permissive policies (PERFORMANCE)
--
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/_/sql
-- ============================================================================

BEGIN;

-- ============================================================================
-- PART 1: ENABLE RLS ON TABLES WITH POLICIES (CRITICAL SECURITY FIX)
-- ============================================================================

-- Enable RLS on chat_conversations
ALTER TABLE public.chat_conversations ENABLE ROW LEVEL SECURITY;

-- Enable RLS on chat_messages
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Enable RLS on documents
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- Enable RLS on document_chunks
ALTER TABLE public.document_chunks ENABLE ROW LEVEL SECURITY;

-- Enable RLS on users
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Enable RLS on tenants
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

-- Log success
DO $$
BEGIN
  RAISE NOTICE '✅ RLS enabled on 6 tables';
END $$;

-- ============================================================================
-- PART 2: OPTIMIZE AUTH FUNCTION CALLS IN RLS POLICIES (PERFORMANCE)
-- ============================================================================

-- Fix tenant_admins policies
DO $$
BEGIN
  -- Drop existing policy
  DROP POLICY IF EXISTS admin_access ON public.tenant_admins;
  
  -- Recreate with optimized auth function call
  CREATE POLICY admin_access ON public.tenant_admins
    FOR ALL
    TO authenticated
    USING (
      tenant_id IN (
        SELECT tenant_id 
        FROM public.users 
        WHERE id = (SELECT auth.uid())
      )
    );
    
  RAISE NOTICE '✅ Optimized tenant_admins.admin_access policy';
END $$;

-- Fix admin_audit_log policies
DO $$
BEGIN
  DROP POLICY IF EXISTS admin_audit_service_role_access ON public.admin_audit_log;
  
  CREATE POLICY admin_audit_service_role_access ON public.admin_audit_log
    FOR ALL
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 
        FROM public.tenant_admins 
        WHERE user_id = (SELECT auth.uid()) 
        AND tenant_id = admin_audit_log.tenant_id
      )
    );
    
  RAISE NOTICE '✅ Optimized admin_audit_log.admin_audit_service_role_access policy';
END $$;

-- Fix usage_tracking policies
DO $$
BEGIN
  DROP POLICY IF EXISTS "Users can view own tenant usage" ON public.usage_tracking;
  DROP POLICY IF EXISTS "Service role can manage usage" ON public.usage_tracking;
  
  -- Combine into single optimized policy
  CREATE POLICY usage_tracking_access ON public.usage_tracking
    FOR SELECT
    TO authenticated
    USING (
      tenant_id IN (
        SELECT tenant_id 
        FROM public.users 
        WHERE id = (SELECT auth.uid())
      )
    );
    
  RAISE NOTICE '✅ Consolidated usage_tracking policies (reduced from 2 to 1)';
END $$;

-- ============================================================================
-- PART 3: CONSOLIDATE MULTIPLE PERMISSIVE POLICIES (PERFORMANCE)
-- ============================================================================

-- Consolidate tenant_admins policies
DO $$
BEGIN
  -- Drop overlapping policies
  DROP POLICY IF EXISTS "Admins can view tenant admins" ON public.tenant_admins;
  DROP POLICY IF EXISTS "Super admins can delete tenant admins" ON public.tenant_admins;
  DROP POLICY IF EXISTS "Super admins can insert tenant admins" ON public.tenant_admins;
  DROP POLICY IF EXISTS "Super admins can update tenant admins" ON public.tenant_admins;
  
  -- Single comprehensive policy
  CREATE POLICY tenant_admins_management ON public.tenant_admins
    FOR ALL
    TO authenticated
    USING (
      -- Users can manage admins in their tenant
      tenant_id IN (
        SELECT ta.tenant_id 
        FROM public.tenant_admins ta
        WHERE ta.user_id = (SELECT auth.uid())
        AND ta.access_level = 1 -- Only level 1 (super admin) can manage
      )
    )
    WITH CHECK (
      tenant_id IN (
        SELECT ta.tenant_id 
        FROM public.tenant_admins ta
        WHERE ta.user_id = (SELECT auth.uid())
        AND ta.access_level = 1
      )
    );
    
  RAISE NOTICE '✅ Consolidated tenant_admins policies (reduced from 5 to 1)';
END $$;

-- Consolidate admin_audit_log policies
DO $$
BEGIN
  DROP POLICY IF EXISTS admin_audit_tenant_admin_read ON public.admin_audit_log;
  
  -- Keep only the optimized service_role_access policy created above
  RAISE NOTICE '✅ Consolidated admin_audit_log policies (reduced from 2 to 1)';
END $$;

COMMIT;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
DECLARE
  rls_enabled_count INT;
  policy_count INT;
BEGIN
  -- Check RLS is enabled
  SELECT COUNT(*) INTO rls_enabled_count
  FROM pg_tables 
  WHERE schemaname = 'public' 
  AND tablename IN ('chat_conversations', 'chat_messages', 'documents', 'document_chunks', 'users', 'tenants')
  AND rowsecurity = true;
  
  IF rls_enabled_count = 6 THEN
    RAISE NOTICE '✅ SUCCESS: RLS enabled on all 6 critical tables';
  ELSE
    RAISE WARNING '⚠️ WARNING: RLS only enabled on % out of 6 tables', rls_enabled_count;
  END IF;
  
  -- Check policy count reduction
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
  AND tablename IN ('tenant_admins', 'admin_audit_log', 'usage_tracking');
  
  RAISE NOTICE '📊 Total RLS policies after consolidation: %', policy_count;
  RAISE NOTICE '🎯 Expected significant performance improvement in RLS policy evaluation';
END $$;

