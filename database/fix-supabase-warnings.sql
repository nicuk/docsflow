-- SURGICAL FIX: Supabase Security Warnings Resolution
-- Fixes function search path mutable warnings and RLS policy optimizations

-- Fix 1: Function Search Path Mutable (Lines 121-194)
-- Set search_path for security functions to prevent injection attacks

ALTER FUNCTION public.is_admin() 
SET search_path = 'public';

ALTER FUNCTION public.complete_onboarding_atomic() 
SET search_path = 'public';

ALTER FUNCTION public.is_user() 
SET search_path = 'public';

ALTER FUNCTION public.match_documents_hybrid() 
SET search_path = 'public';

-- Fix 2: Auth RLS Initialization Plan Optimization (Lines 196-232)
-- Replace auth.function() with (select auth.function()) for better performance

-- Update tenant_admins admin_access policy
DROP POLICY IF EXISTS admin_access ON public.tenant_admins;
CREATE POLICY admin_access ON public.tenant_admins 
FOR ALL 
TO authenticated 
USING ((select current_setting('app.current_tenant', true)) = tenant_id::text);

-- Update admin_audit_log admin_audit_service_role_access policy 
DROP POLICY IF EXISTS admin_audit_service_role_access ON public.admin_audit_log;
CREATE POLICY admin_audit_service_role_access ON public.admin_audit_log 
FOR SELECT 
TO service_role 
USING (true);

-- Fix 3: Multiple Permissive Policies Consolidation (Lines 234-592)
-- Consolidate multiple permissive policies into single optimized policies

-- Consolidate admin_audit_log policies
DROP POLICY IF EXISTS admin_audit_tenant_admin_read ON public.admin_audit_log;

-- Update single consolidated policy for admin_audit_log
DROP POLICY IF EXISTS admin_audit_service_role_access ON public.admin_audit_log;
CREATE POLICY admin_audit_consolidated_access ON public.admin_audit_log 
FOR SELECT 
USING (
  -- Service role access
  (select current_user) = 'service_role'
  OR 
  -- Tenant admin access
  (
    (select auth.uid()) IN (
      SELECT user_id FROM tenant_admins 
      WHERE tenant_id = admin_audit_log.tenant_id 
      AND is_active = true
    )
  )
);

-- Consolidate tenant_admins policies
DROP POLICY IF EXISTS "Super admins can delete tenant admins" ON public.tenant_admins;
DROP POLICY IF EXISTS "Super admins can insert tenant admins" ON public.tenant_admins;
DROP POLICY IF EXISTS "Super admins can update tenant admins" ON public.tenant_admins;
DROP POLICY IF EXISTS "Admins can view tenant admins" ON public.tenant_admins;
DROP POLICY IF EXISTS admin_access ON public.tenant_admins;

-- Create single consolidated policy for tenant_admins
CREATE POLICY tenant_admins_consolidated_access ON public.tenant_admins 
FOR ALL 
USING (
  -- Current tenant context matches
  (select current_setting('app.current_tenant', true)) = tenant_id::text
  OR 
  -- User is admin of this tenant
  (select auth.uid()) IN (
    SELECT user_id FROM tenant_admins ta 
    WHERE ta.tenant_id = tenant_admins.tenant_id 
    AND ta.is_active = true
  )
  OR
  -- Service role access
  (select current_user) = 'service_role'
);

-- Performance optimization comment
COMMENT ON POLICY tenant_admins_consolidated_access ON public.tenant_admins IS 
'Consolidated policy replacing 8 separate permissive policies for optimal performance';

COMMENT ON POLICY admin_audit_consolidated_access ON public.admin_audit_log IS 
'Consolidated policy with optimized auth.function() calls using select wrappers';
