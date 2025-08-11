-- CRITICAL HOTFIX: Fix tenant creation RLS policy
-- Issue: Service role cannot insert into tenants table due to incorrect RLS syntax
-- Date: 2025-08-12
-- Priority: URGENT - Blocks all onboarding

-- Step 1: Drop the broken service role policy
DROP POLICY IF EXISTS "Service role can access all tenants" ON tenants;

-- Step 2: Create correct service role policy with proper syntax
CREATE POLICY "Service role can access all tenants" ON tenants
  FOR ALL TO service_role USING (true);

-- Step 3: Verify RLS is enabled (should already be enabled)
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;

-- Verification query (run after applying):
-- SELECT policyname, cmd, roles, qual FROM pg_policies WHERE tablename = 'tenants';
