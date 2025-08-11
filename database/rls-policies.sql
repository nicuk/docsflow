-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES FOR MULTI-TENANT ISOLATION
-- ============================================================================
-- This file implements enterprise-grade tenant isolation at the database level
-- Apply these policies to your Supabase database for bulletproof security

-- Enable RLS on all tenant-related tables
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
  FOR ALL TO service_role USING (true);

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

-- 8. ANALYTICS TABLE - Tenant isolation for analytics data
ALTER TABLE analytics ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only access analytics in their tenant
CREATE POLICY "Users can only access analytics in their tenant" ON analytics
  FOR ALL USING (
    tenant_id IN (
      SELECT tenant_id FROM users WHERE id = auth.uid()
    )
  );

-- Policy: Service role can access all analytics
CREATE POLICY "Service role can access all analytics" ON analytics
  FOR ALL USING (
    auth.role() = 'service_role'
  );

-- 9. SEARCH_HISTORY TABLE - Tenant isolation for search tracking
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

-- 10. NOTIFICATIONS TABLE - Tenant isolation for notifications
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
-- AUDIT TRIGGERS FOR SECURITY MONITORING
-- ============================================================================

-- Create audit log table for security events
CREATE TABLE IF NOT EXISTS security_audit_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id),
  user_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL,
  table_name TEXT NOT NULL,
  record_id UUID,
  old_values JSONB,
  new_values JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on audit log
ALTER TABLE security_audit_log ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see audit logs for their tenant
CREATE POLICY "Users can only see audit logs for their tenant" ON security_audit_log
  FOR SELECT USING (
    tenant_id IN (
      SELECT tenant_id FROM users WHERE id = auth.uid()
    )
  );

-- Policy: Service role can access all audit logs
CREATE POLICY "Service role can access all audit logs" ON security_audit_log
  FOR ALL USING (
    auth.role() = 'service_role'
  );

-- Function: Log security events
CREATE OR REPLACE FUNCTION log_security_event(
  p_action TEXT,
  p_table_name TEXT,
  p_record_id UUID DEFAULT NULL,
  p_old_values JSONB DEFAULT NULL,
  p_new_values JSONB DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
  INSERT INTO security_audit_log (
    tenant_id,
    user_id,
    action,
    table_name,
    record_id,
    old_values,
    new_values
  ) VALUES (
    get_current_user_tenant_id(),
    auth.uid(),
    p_action,
    p_table_name,
    p_record_id,
    p_old_values,
    p_new_values
  );
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
4. Monitor the security_audit_log table for any access violations
5. Update your API routes to use service role for cross-tenant operations

SECURITY CONSIDERATIONS:

- Service role should only be used for legitimate admin operations
- Monitor audit logs regularly for suspicious activity
- Consider implementing additional policies for specific business rules
- Test thoroughly in staging before deploying to production

PERFORMANCE NOTES:

- RLS policies add overhead to queries - monitor performance
- Consider adding indexes on tenant_id columns if not already present
- Use EXPLAIN ANALYZE to optimize policy queries if needed
*/
