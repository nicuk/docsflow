-- ============================================================================
-- CORRECTED ROW LEVEL SECURITY (RLS) POLICIES FOR MULTI-TENANT ISOLATION
-- ============================================================================
-- This file implements RLS policies based on your ACTUAL Supabase schema
-- Apply these policies to your Supabase database for tenant isolation

-- Enable RLS on all tenant-related tables (based on your actual schema)
-- ============================================================================

-- 1. TENANTS TABLE - Only allow access to own tenant data
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only access their own tenant
CREATE POLICY "Users can only access their own tenant" ON tenants
  FOR ALL USING (
    id IN (
      SELECT tenant_id FROM users WHERE id = auth.uid()
    )
  );

-- Policy: Service role can access all tenants (for admin operations)
CREATE POLICY "Service role can access all tenants" ON tenants
  FOR ALL USING (
    auth.role() = 'service_role'
  );

-- 2. USERS TABLE - Tenant isolation for user management
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see users in their tenant
CREATE POLICY "Users can only see users in their tenant" ON users
  FOR SELECT USING (
    tenant_id IN (
      SELECT tenant_id FROM users WHERE id = auth.uid()
    )
  );

-- Policy: Users can update their own profile
CREATE POLICY "Users can update their own profile" ON users
  FOR UPDATE USING (
    id = auth.uid()
  );

-- Policy: Service role can manage all users
CREATE POLICY "Service role can manage all users" ON users
  FOR ALL USING (
    auth.role() = 'service_role'
  );

-- 3. DOCUMENTS TABLE - Critical tenant isolation
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only access documents in their tenant
CREATE POLICY "Users can only access documents in their tenant" ON documents
  FOR ALL USING (
    tenant_id IN (
      SELECT tenant_id FROM users WHERE id = auth.uid()
    )
  );

-- Policy: Service role can access all documents
CREATE POLICY "Service role can access all documents" ON documents
  FOR ALL USING (
    auth.role() = 'service_role'
  );

-- 4. DOCUMENT_CHUNKS TABLE - Inherit tenant isolation from documents
ALTER TABLE document_chunks ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only access chunks from documents in their tenant
CREATE POLICY "Users can only access chunks in their tenant" ON document_chunks
  FOR ALL USING (
    document_id IN (
      SELECT d.id FROM documents d
      JOIN users u ON d.tenant_id = u.tenant_id
      WHERE u.id = auth.uid()
    )
  );

-- Policy: Service role can access all chunks
CREATE POLICY "Service role can access all chunks" ON document_chunks
  FOR ALL USING (
    auth.role() = 'service_role'
  );

-- 5. CHAT_CONVERSATIONS TABLE - Tenant isolation for conversations
ALTER TABLE chat_conversations ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only access conversations in their tenant
CREATE POLICY "Users can only access conversations in their tenant" ON chat_conversations
  FOR ALL USING (
    tenant_id IN (
      SELECT tenant_id FROM users WHERE id = auth.uid()
    )
  );

-- Policy: Service role can access all conversations
CREATE POLICY "Service role can access all conversations" ON chat_conversations
  FOR ALL USING (
    auth.role() = 'service_role'
  );

-- 6. CHAT_MESSAGES TABLE - Inherit tenant isolation from conversations
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only access messages from conversations in their tenant
CREATE POLICY "Users can only access messages in their tenant" ON chat_messages
  FOR ALL USING (
    conversation_id IN (
      SELECT c.id FROM chat_conversations c
      JOIN users u ON c.tenant_id = u.tenant_id
      WHERE u.id = auth.uid()
    )
  );

-- Policy: Service role can access all messages
CREATE POLICY "Service role can access all messages" ON chat_messages
  FOR ALL USING (
    auth.role() = 'service_role'
  );

-- 7. LEADS TABLE - Tenant isolation for lead management
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only access leads in their tenant
CREATE POLICY "Users can only access leads in their tenant" ON leads
  FOR ALL USING (
    tenant_id IN (
      SELECT tenant_id FROM users WHERE id = auth.uid()
    )
  );

-- Policy: Service role can access all leads
CREATE POLICY "Service role can access all leads" ON leads
  FOR ALL USING (
    auth.role() = 'service_role'
  );

-- 8. SEARCH_HISTORY TABLE - Tenant isolation for search tracking
ALTER TABLE search_history ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only access search history in their tenant
CREATE POLICY "Users can only access search history in their tenant" ON search_history
  FOR ALL USING (
    tenant_id IN (
      SELECT tenant_id FROM users WHERE id = auth.uid()
    )
  );

-- Policy: Service role can access all search history
CREATE POLICY "Service role can access all search history" ON search_history
  FOR ALL USING (
    auth.role() = 'service_role'
  );

-- 9. NOTIFICATIONS TABLE - Tenant isolation for notifications
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only access notifications in their tenant
CREATE POLICY "Users can only access notifications in their tenant" ON notifications
  FOR ALL USING (
    tenant_id IN (
      SELECT tenant_id FROM users WHERE id = auth.uid()
    )
  );

-- Policy: Service role can access all notifications
CREATE POLICY "Service role can access all notifications" ON notifications
  FOR ALL USING (
    auth.role() = 'service_role'
  );

-- 10. ANALYTICS_EVENTS TABLE - Tenant isolation for analytics
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only access analytics events in their tenant
CREATE POLICY "Users can only access analytics events in their tenant" ON analytics_events
  FOR ALL USING (
    tenant_id IN (
      SELECT tenant_id FROM users WHERE id = auth.uid()
    )
  );

-- Policy: Service role can access all analytics events
CREATE POLICY "Service role can access all analytics events" ON analytics_events
  FOR ALL USING (
    auth.role() = 'service_role'
  );

-- 11. ANALYTICS_AGGREGATIONS TABLE - Tenant isolation for aggregated analytics
ALTER TABLE analytics_aggregations ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only access analytics aggregations in their tenant
CREATE POLICY "Users can only access analytics aggregations in their tenant" ON analytics_aggregations
  FOR ALL USING (
    tenant_id IN (
      SELECT tenant_id FROM users WHERE id = auth.uid()
    )
  );

-- Policy: Service role can access all analytics aggregations
CREATE POLICY "Service role can access all analytics aggregations" ON analytics_aggregations
  FOR ALL USING (
    auth.role() = 'service_role'
  );

-- 12. API_USAGE TABLE - Tenant isolation for API usage tracking
ALTER TABLE api_usage ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only access API usage in their tenant
CREATE POLICY "Users can only access API usage in their tenant" ON api_usage
  FOR ALL USING (
    tenant_id IN (
      SELECT tenant_id FROM users WHERE id = auth.uid()
    )
  );

-- Policy: Service role can access all API usage
CREATE POLICY "Service role can access all API usage" ON api_usage
  FOR ALL USING (
    auth.role() = 'service_role'
  );

-- 13. USER_SESSIONS TABLE - Tenant isolation for user sessions
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only access sessions in their tenant
CREATE POLICY "Users can only access sessions in their tenant" ON user_sessions
  FOR ALL USING (
    tenant_id IN (
      SELECT tenant_id FROM users WHERE id = auth.uid()
    )
  );

-- Policy: Service role can access all sessions
CREATE POLICY "Service role can access all sessions" ON user_sessions
  FOR ALL USING (
    auth.role() = 'service_role'
  );

-- 14. USER_INVITATIONS TABLE - Tenant isolation for invitations
ALTER TABLE user_invitations ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only access invitations in their tenant
CREATE POLICY "Users can only access invitations in their tenant" ON user_invitations
  FOR ALL USING (
    tenant_id IN (
      SELECT tenant_id FROM users WHERE id = auth.uid()
    )
  );

-- Policy: Service role can access all invitations
CREATE POLICY "Service role can access all invitations" ON user_invitations
  FOR ALL USING (
    auth.role() = 'service_role'
  );

-- 15. WEBHOOK_ENDPOINTS TABLE - Tenant isolation for webhooks
ALTER TABLE webhook_endpoints ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only access webhook endpoints in their tenant
CREATE POLICY "Users can only access webhook endpoints in their tenant" ON webhook_endpoints
  FOR ALL USING (
    tenant_id IN (
      SELECT tenant_id FROM users WHERE id = auth.uid()
    )
  );

-- Policy: Service role can access all webhook endpoints
CREATE POLICY "Service role can access all webhook endpoints" ON webhook_endpoints
  FOR ALL USING (
    auth.role() = 'service_role'
  );

-- 16. WEBHOOK_DELIVERIES TABLE - Inherit tenant isolation from webhook_endpoints
ALTER TABLE webhook_deliveries ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only access webhook deliveries in their tenant
CREATE POLICY "Users can only access webhook deliveries in their tenant" ON webhook_deliveries
  FOR ALL USING (
    webhook_endpoint_id IN (
      SELECT we.id FROM webhook_endpoints we
      JOIN users u ON we.tenant_id = u.tenant_id
      WHERE u.id = auth.uid()
    )
  );

-- Policy: Service role can access all webhook deliveries
CREATE POLICY "Service role can access all webhook deliveries" ON webhook_deliveries
  FOR ALL USING (
    auth.role() = 'service_role'
  );

-- ============================================================================
-- SECURITY FUNCTIONS FOR ENHANCED TENANT VALIDATION
-- ============================================================================

-- Function: Get current user's tenant ID
CREATE OR REPLACE FUNCTION get_current_user_tenant_id()
RETURNS UUID AS $$
BEGIN
  RETURN (
    SELECT tenant_id FROM users WHERE id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Check if user has access to specific tenant
CREATE OR REPLACE FUNCTION user_has_tenant_access(target_tenant_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND tenant_id = target_tenant_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Validate tenant context for API operations
CREATE OR REPLACE FUNCTION validate_tenant_context(target_tenant_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- Allow service role to access any tenant
  IF auth.role() = 'service_role' THEN
    RETURN TRUE;
  END IF;
  
  -- Check if authenticated user has access to the target tenant
  RETURN user_has_tenant_access(target_tenant_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Use these queries to verify RLS is working correctly:

/*
-- 1. Check RLS is enabled on all tables
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND rowsecurity = true;

-- 2. List all RLS policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE schemaname = 'public';

-- 3. Test tenant isolation (run as different users)
SELECT * FROM documents; -- Should only show documents for current user's tenant

-- 4. Test service role access (run with service role)
SELECT * FROM documents; -- Should show all documents across all tenants
*/

-- ============================================================================
-- DEPLOYMENT NOTES
-- ============================================================================

/*
DEPLOYMENT INSTRUCTIONS:

1. Apply this SQL to your Supabase database via the SQL Editor
2. Verify all policies are created successfully
3. Test with different user accounts to ensure isolation works
4. Monitor for any access violations

TABLES COVERED (based on your actual schema):
✅ tenants
✅ users  
✅ documents
✅ document_chunks
✅ chat_conversations
✅ chat_messages
✅ leads
✅ search_history
✅ notifications
✅ analytics_events
✅ analytics_aggregations
✅ api_usage
✅ user_sessions
✅ user_invitations
✅ webhook_endpoints
✅ webhook_deliveries

TABLES NOT COVERED (don't exist in your schema):
❌ analytics (referenced in original script but doesn't exist)

SECURITY CONSIDERATIONS:
- Service role should only be used for legitimate admin operations
- Test thoroughly before deploying to production
- Monitor performance impact of RLS policies
*/
