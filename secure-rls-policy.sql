-- ============================================================================
-- SECURE RLS POLICY: Maximum Security with Proper Tenant Isolation
-- ============================================================================

-- 1. First, check current state
SELECT 'CURRENT RLS STATUS' as check_name,
       tablename,
       rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename = 'chat_conversations';

-- 2. Check existing policies
SELECT 'EXISTING POLICIES' as check_name,
       policyname,
       cmd,
       roles,
       qual
FROM pg_policies 
WHERE tablename = 'chat_conversations';

-- 3. Drop any overly permissive policies
DROP POLICY IF EXISTS "chat_conversations_allow_authenticated" ON chat_conversations;
DROP POLICY IF EXISTS "Enable all for authenticated users" ON chat_conversations;

-- 4. Create strict tenant isolation policy
CREATE POLICY "chat_conversations_strict_tenant_isolation" 
ON chat_conversations 
FOR ALL 
TO authenticated
USING (
  -- User can only access conversations from their tenant
  tenant_id = current_setting('app.current_tenant_id', true)::uuid
  OR
  -- Fallback: check via subdomain header (for API calls)
  tenant_id IN (
    SELECT t.id FROM tenants t 
    WHERE t.subdomain = current_setting('app.current_tenant_subdomain', true)
    AND t.subdomain IS NOT NULL
    AND length(t.subdomain) > 0
  )
)
WITH CHECK (
  -- When creating, ensure tenant_id matches current tenant
  tenant_id = current_setting('app.current_tenant_id', true)::uuid
  OR
  tenant_id IN (
    SELECT t.id FROM tenants t 
    WHERE t.subdomain = current_setting('app.current_tenant_subdomain', true)
    AND t.subdomain IS NOT NULL
    AND length(t.subdomain) > 0
  )
);

-- 5. Ensure RLS is enabled
ALTER TABLE chat_conversations ENABLE ROW LEVEL SECURITY;

-- 6. Verify security configuration
SELECT 'SECURITY VERIFICATION' as check_name,
       tablename,
       rowsecurity as rls_enabled,
       (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'chat_conversations') as policy_count
FROM pg_tables 
WHERE tablename = 'chat_conversations';

-- 7. Test the policy with current tenant
SELECT 'POLICY TEST' as test_name,
       CASE 
         WHEN current_setting('app.current_tenant_subdomain', true) = 'bitto' 
         THEN '✅ Tenant context available'
         ELSE '⚠️ Need to set tenant context'
       END as tenant_status;

-- 8. Show final policies
SELECT 'FINAL POLICIES' as check_name,
       policyname,
       cmd,
       permissive,
       roles
FROM pg_policies 
WHERE tablename = 'chat_conversations';
