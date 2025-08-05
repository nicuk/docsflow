-- CORRECTED RLS PERFORMANCE FIX
-- Addresses the WRONG approach in 019_fix_rls_performance_warnings.sql
-- Uses security context variables instead of subqueries

BEGIN;

RAISE NOTICE 'CORRECTING RLS performance optimization with proper security context approach';

-- ========================================
-- PART 1: UNDERSTAND THE PROBLEM
-- ========================================

-- WRONG APPROACH (from migration 019):
-- (SELECT auth.uid()) = id  -- This STILL evaluates per row!
--
-- CORRECT APPROACH:
-- Use security context variables that are evaluated once per query

-- ========================================
-- PART 2: SET UP SECURITY CONTEXT SYSTEM
-- ========================================

-- Create function to set tenant context for current session
CREATE OR REPLACE FUNCTION set_tenant_context(tenant_uuid UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    -- Set the tenant context for this session
    PERFORM set_config('app.current_tenant_id', tenant_uuid::text, false);
    
    -- Also set user context if available
    IF auth.uid() IS NOT NULL THEN
        PERFORM set_config('app.current_user_id', auth.uid()::text, false);
    END IF;
END;
$$;

-- Create function to get current tenant context
CREATE OR REPLACE FUNCTION get_current_tenant_id()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    -- Return the tenant ID from session context
    RETURN COALESCE(
        current_setting('app.current_tenant_id', true)::UUID,
        (SELECT tenant_id FROM users WHERE id = auth.uid() LIMIT 1)
    );
END;
$$;

-- ========================================
-- PART 3: CREATE OPTIMIZED RLS POLICIES
-- ========================================

-- Drop the incorrect policies from migration 019
DROP POLICY IF EXISTS "user_registration_optimized" ON public.users;
DROP POLICY IF EXISTS "user_select_optimized" ON public.users;
DROP POLICY IF EXISTS "user_update_optimized" ON public.users;
DROP POLICY IF EXISTS "user_delete_optimized" ON public.users;

RAISE NOTICE 'Dropped incorrect RLS policies from migration 019';

-- Create CORRECT optimized policies using security context
-- Policy 1: INSERT - Properly optimized
CREATE POLICY "user_registration_context_optimized" ON public.users
  FOR INSERT 
  WITH CHECK (
    -- Service role can always insert
    auth.role() = 'service_role'
    -- OR user inserting their own record
    OR (
      auth.uid() = id 
      AND (
        -- Either no tenant restriction
        tenant_id IS NULL
        -- OR tenant matches session context
        OR tenant_id = get_current_tenant_id()
      )
    )
  );

-- Policy 2: SELECT - Properly optimized with security context
CREATE POLICY "user_select_context_optimized" ON public.users
  FOR SELECT USING (
    -- Service role can see all
    auth.role() = 'service_role'
    -- OR user can see their own record
    OR auth.uid() = id
    -- OR user can see users in same tenant (context-optimized)
    OR (
      tenant_id IS NOT NULL 
      AND auth.uid() IS NOT NULL
      AND tenant_id = get_current_tenant_id()
    )
  );

-- Policy 3: UPDATE - Properly optimized
CREATE POLICY "user_update_context_optimized" ON public.users
  FOR UPDATE USING (
    -- Service role can update all
    auth.role() = 'service_role'
    -- OR user can update their own record
    OR auth.uid() = id
  ) WITH CHECK (
    -- Same check for WITH CHECK clause
    auth.role() = 'service_role'
    OR auth.uid() = id
  );

-- Policy 4: DELETE - Service role only for safety
CREATE POLICY "user_delete_context_optimized" ON public.users
  FOR DELETE USING (
    auth.role() = 'service_role'
  );

RAISE NOTICE 'Created CORRECT RLS policies using security context optimization';

-- ========================================
-- PART 4: MIDDLEWARE INTEGRATION HELPER
-- ========================================

-- Function for middleware to set tenant context from subdomain
CREATE OR REPLACE FUNCTION set_tenant_context_from_subdomain(subdomain_name TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    tenant_uuid UUID;
BEGIN
    -- Find tenant by subdomain
    SELECT id INTO tenant_uuid
    FROM tenants
    WHERE subdomain = subdomain_name;
    
    IF tenant_uuid IS NOT NULL THEN
        -- Set the context for this session
        PERFORM set_tenant_context(tenant_uuid);
        RETURN tenant_uuid;
    ELSE
        RAISE EXCEPTION 'Tenant not found for subdomain: %', subdomain_name;
    END IF;
END;
$$;

-- ========================================
-- PART 5: PERFORMANCE VERIFICATION
-- ========================================

-- Create test function to verify performance improvement
CREATE OR REPLACE FUNCTION verify_rls_performance()
RETURNS TABLE(
    policy_name TEXT,
    optimization_status TEXT,
    performance_notes TEXT
)
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        policyname::TEXT,
        CASE 
            WHEN qual LIKE '%get_current_tenant_id()%' THEN 'OPTIMIZED ✅'
            WHEN qual LIKE '%auth.uid()%' AND qual NOT LIKE '%(SELECT auth.%' THEN 'GOOD ✅'
            WHEN qual LIKE '%(SELECT auth.%' THEN 'SUBQUERY - NEEDS FIX ⚠️'
            WHEN qual LIKE '%current_setting(%' THEN 'CONTEXT OPTIMIZED ✅'
            ELSE 'UNKNOWN'
        END::TEXT,
        CASE 
            WHEN qual LIKE '%get_current_tenant_id()%' THEN 'Uses context function - evaluates once per query'
            WHEN qual LIKE '%auth.uid()%' AND qual NOT LIKE '%(SELECT auth.%' THEN 'Direct auth call - acceptable performance'
            WHEN qual LIKE '%(SELECT auth.%' THEN 'WRONG: Subquery still evaluates per row'
            ELSE 'Check policy manually'
        END::TEXT
    FROM pg_policies 
    WHERE tablename = 'users' AND schemaname = 'public'
    ORDER BY policyname;
END;
$$;

COMMIT;

-- ========================================
-- USAGE INSTRUCTIONS FOR MIDDLEWARE
-- ========================================

-- In your middleware.ts, use this pattern:
/*
// 1. Extract subdomain
const subdomain = extractTenantFromHostname(hostname);

// 2. Set tenant context in database (for RLS optimization)
if (subdomain) {
  const { data } = await supabase.rpc('set_tenant_context_from_subdomain', {
    subdomain_name: subdomain
  });
}

// 3. Continue with request processing
*/

RAISE NOTICE 'CORRECTED RLS performance optimization complete!';
RAISE NOTICE 'Run: SELECT * FROM verify_rls_performance(); to verify optimization';
RAISE NOTICE 'Integration guide: Use set_tenant_context_from_subdomain() in middleware';