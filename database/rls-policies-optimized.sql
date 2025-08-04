-- ============================================================================
-- OPTIMIZED ROW LEVEL SECURITY (RLS) POLICIES FOR PRODUCTION
-- ============================================================================
-- This version addresses all Supabase linter warnings for optimal performance
-- and security in production environments

-- First, drop existing policies to avoid conflicts
-- ============================================================================

-- Drop all existing policies (run this first if redeploying)
DO $$ 
DECLARE
    r RECORD;
BEGIN
    -- Drop all RLS policies on tenant-related tables
    FOR r IN (
        SELECT schemaname, tablename, policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename IN (
            'tenants', 'users', 'documents', 'document_chunks', 
            'chat_conversations', 'chat_messages', 'leads', 'search_history',
            'notifications', 'analytics_events', 'analytics_aggregations',
            'api_usage', 'user_sessions', 'user_invitations', 
            'webhook_endpoints', 'webhook_deliveries'
        )
    ) LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
    END LOOP;
END $$;

-- Drop existing functions
DROP FUNCTION IF EXISTS get_current_user_tenant_id();
DROP FUNCTION IF EXISTS user_has_tenant_access(UUID);
DROP FUNCTION IF EXISTS validate_tenant_context(UUID);

-- ============================================================================
-- OPTIMIZED SECURITY FUNCTIONS WITH FIXED SEARCH PATH
-- ============================================================================

-- Function: Get current user's tenant ID (optimized for RLS)
CREATE OR REPLACE FUNCTION get_current_user_tenant_id()
RETURNS UUID 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN (
    SELECT tenant_id FROM users WHERE id = (SELECT auth.uid())
  );
END;
$$;

-- Function: Check if user has access to specific tenant (optimized)
CREATE OR REPLACE FUNCTION user_has_tenant_access(target_tenant_id UUID)
RETURNS BOOLEAN 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM users 
    WHERE id = (SELECT auth.uid()) 
    AND tenant_id = target_tenant_id
  );
END;
$$;

-- Function: Validate tenant context for API operations (optimized)
CREATE OR REPLACE FUNCTION validate_tenant_context(target_tenant_id UUID)
RETURNS BOOLEAN 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Allow service role to access any tenant
  IF (SELECT auth.role()) = 'service_role' THEN
    RETURN TRUE;
  END IF;
  
  -- Check if authenticated user has access to the target tenant
  RETURN user_has_tenant_access(target_tenant_id);
END;
$$;

-- ============================================================================
-- OPTIMIZED RLS POLICIES - SINGLE POLICY PER TABLE
-- ============================================================================

-- 1. TENANTS TABLE - Consolidated policy
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_access_policy" ON tenants
  FOR ALL USING (
    (SELECT auth.role()) = 'service_role' OR
    id IN (
      SELECT tenant_id FROM users WHERE id = (SELECT auth.uid())
    )
  );

-- 2. USERS TABLE - Consolidated policy
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_access_policy" ON users
  FOR ALL USING (
    (SELECT auth.role()) = 'service_role' OR
    tenant_id IN (
      SELECT tenant_id FROM users WHERE id = (SELECT auth.uid())
    ) OR
    id = (SELECT auth.uid())
  );

-- 3. DOCUMENTS TABLE - Consolidated policy
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "document_access_policy" ON documents
  FOR ALL USING (
    (SELECT auth.role()) = 'service_role' OR
    tenant_id IN (
      SELECT tenant_id FROM users WHERE id = (SELECT auth.uid())
    )
  );

-- 4. DOCUMENT_CHUNKS TABLE - Consolidated policy
ALTER TABLE document_chunks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "document_chunk_access_policy" ON document_chunks
  FOR ALL USING (
    (SELECT auth.role()) = 'service_role' OR
    document_id IN (
      SELECT d.id FROM documents d
      JOIN users u ON d.tenant_id = u.tenant_id
      WHERE u.id = (SELECT auth.uid())
    )
  );

-- 5. CHAT_CONVERSATIONS TABLE - Consolidated policy
ALTER TABLE chat_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "chat_conversation_access_policy" ON chat_conversations
  FOR ALL USING (
    (SELECT auth.role()) = 'service_role' OR
    tenant_id IN (
      SELECT tenant_id FROM users WHERE id = (SELECT auth.uid())
    )
  );

-- 6. CHAT_MESSAGES TABLE - Consolidated policy
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "chat_message_access_policy" ON chat_messages
  FOR ALL USING (
    (SELECT auth.role()) = 'service_role' OR
    conversation_id IN (
      SELECT c.id FROM chat_conversations c
      JOIN users u ON c.tenant_id = u.tenant_id
      WHERE u.id = (SELECT auth.uid())
    )
  );

-- 7. LEADS TABLE - Consolidated policy
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "lead_access_policy" ON leads
  FOR ALL USING (
    (SELECT auth.role()) = 'service_role' OR
    tenant_id IN (
      SELECT tenant_id FROM users WHERE id = (SELECT auth.uid())
    )
  );

-- 8. SEARCH_HISTORY TABLE - Consolidated policy
ALTER TABLE search_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "search_history_access_policy" ON search_history
  FOR ALL USING (
    (SELECT auth.role()) = 'service_role' OR
    tenant_id IN (
      SELECT tenant_id FROM users WHERE id = (SELECT auth.uid())
    )
  );

-- 9. NOTIFICATIONS TABLE - Consolidated policy
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notification_access_policy" ON notifications
  FOR ALL USING (
    (SELECT auth.role()) = 'service_role' OR
    tenant_id IN (
      SELECT tenant_id FROM users WHERE id = (SELECT auth.uid())
    )
  );

-- 10. ANALYTICS_EVENTS TABLE - Consolidated policy
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "analytics_event_access_policy" ON analytics_events
  FOR ALL USING (
    (SELECT auth.role()) = 'service_role' OR
    tenant_id IN (
      SELECT tenant_id FROM users WHERE id = (SELECT auth.uid())
    )
  );

-- 11. ANALYTICS_AGGREGATIONS TABLE - Consolidated policy
ALTER TABLE analytics_aggregations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "analytics_aggregation_access_policy" ON analytics_aggregations
  FOR ALL USING (
    (SELECT auth.role()) = 'service_role' OR
    tenant_id IN (
      SELECT tenant_id FROM users WHERE id = (SELECT auth.uid())
    )
  );

-- 12. API_USAGE TABLE - Consolidated policy
ALTER TABLE api_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "api_usage_access_policy" ON api_usage
  FOR ALL USING (
    (SELECT auth.role()) = 'service_role' OR
    tenant_id IN (
      SELECT tenant_id FROM users WHERE id = (SELECT auth.uid())
    )
  );

-- 13. USER_SESSIONS TABLE - Consolidated policy
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_session_access_policy" ON user_sessions
  FOR ALL USING (
    (SELECT auth.role()) = 'service_role' OR
    tenant_id IN (
      SELECT tenant_id FROM users WHERE id = (SELECT auth.uid())
    )
  );

-- 14. USER_INVITATIONS TABLE - Consolidated policy
ALTER TABLE user_invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_invitation_access_policy" ON user_invitations
  FOR ALL USING (
    (SELECT auth.role()) = 'service_role' OR
    tenant_id IN (
      SELECT tenant_id FROM users WHERE id = (SELECT auth.uid())
    )
  );

-- 15. WEBHOOK_ENDPOINTS TABLE - Consolidated policy
ALTER TABLE webhook_endpoints ENABLE ROW LEVEL SECURITY;

CREATE POLICY "webhook_endpoint_access_policy" ON webhook_endpoints
  FOR ALL USING (
    (SELECT auth.role()) = 'service_role' OR
    tenant_id IN (
      SELECT tenant_id FROM users WHERE id = (SELECT auth.uid())
    )
  );

-- 16. WEBHOOK_DELIVERIES TABLE - Consolidated policy
ALTER TABLE webhook_deliveries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "webhook_delivery_access_policy" ON webhook_deliveries
  FOR ALL USING (
    (SELECT auth.role()) = 'service_role' OR
    webhook_endpoint_id IN (
      SELECT we.id FROM webhook_endpoints we
      JOIN users u ON we.tenant_id = u.tenant_id
      WHERE u.id = (SELECT auth.uid())
    )
  );

-- ============================================================================
-- PERFORMANCE INDEXES - RUN SEPARATELY
-- ============================================================================

-- NOTE: Performance indexes must be created separately using:
-- /database/performance-indexes.sql
--
-- This is because CREATE INDEX CONCURRENTLY cannot run inside a transaction block.
-- Run the performance-indexes.sql script after deploying these RLS policies
-- to achieve 10/10 performance score.

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Use these queries to verify optimized RLS is working:

/*
-- 1. Check RLS is enabled on all tables
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND rowsecurity = true;

-- 2. List all RLS policies (should be 1 per table now)
SELECT schemaname, tablename, policyname, permissive, roles, cmd 
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- 3. Test tenant isolation
SELECT * FROM documents; -- Should only show documents for current user's tenant

-- 4. Check for linter warnings (should be significantly reduced)
-- Run Supabase linter again to verify improvements
*/

-- ============================================================================
-- DEPLOYMENT NOTES
-- ============================================================================

/*
OPTIMIZATIONS IMPLEMENTED:

✅ SECURITY FIXES:
- Added SET search_path = public, pg_temp to all functions
- Fixed function_search_path_mutable warnings

✅ PERFORMANCE FIXES:
- Replaced auth.uid() with (SELECT auth.uid()) in all policies
- Replaced auth.role() with (SELECT auth.role()) in all policies
- Fixed auth_rls_initplan warnings for all tables

✅ POLICY CONSOLIDATION:
- Reduced from 2 policies per table to 1 policy per table
- Fixed multiple_permissive_policies warnings
- Improved query performance by reducing policy evaluation overhead

✅ INDEXING:
- Added performance indexes for common RLS lookup patterns
- Used CONCURRENTLY to avoid blocking during index creation

EXPECTED RESULTS:
- All Supabase linter warnings should be resolved
- Significantly improved RLS query performance
- Maintained same security isolation guarantees
- Reduced policy complexity and maintenance overhead

DEPLOYMENT INSTRUCTIONS:
1. Apply this SQL to your Supabase database
2. Run the linter again to verify all warnings are resolved
3. Test tenant isolation with different user accounts
4. Monitor query performance improvements
*/
