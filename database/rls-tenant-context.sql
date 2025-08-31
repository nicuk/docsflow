-- RLS CONTEXT: Create function to set tenant context in session
-- This enables proper Row Level Security policies based on tenant

CREATE OR REPLACE FUNCTION set_tenant_context(tenant_id UUID)
RETURNS VOID AS $$
BEGIN
  -- Set the tenant context in the current session
  PERFORM set_config('app.current_tenant', tenant_id::text, true);
  
  -- Log for debugging (remove in production)
  RAISE NOTICE 'Tenant context set to: %', tenant_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION set_tenant_context(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION set_tenant_context(UUID) TO service_role;

-- RLS CONTEXT: Create function to get current tenant from session
CREATE OR REPLACE FUNCTION get_current_tenant()
RETURNS UUID AS $$
BEGIN
  RETURN current_setting('app.current_tenant', true)::UUID;
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION get_current_tenant() TO authenticated;
GRANT EXECUTE ON FUNCTION get_current_tenant() TO service_role;

-- RLS CONTEXT: Example policy for conversations table
-- Uncomment and modify as needed for your schema

/*
-- Enable RLS on conversations table
ALTER TABLE chat_conversations ENABLE ROW LEVEL SECURITY;

-- Create RLS policy using session context
CREATE POLICY "Tenant isolation for conversations"
ON chat_conversations
FOR ALL
USING (
  tenant_id = get_current_tenant()
  OR 
  tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())
);

-- Grant permissions
GRANT ALL ON chat_conversations TO authenticated;
*/

-- RLS CONTEXT: Helper function to validate tenant access for user
CREATE OR REPLACE FUNCTION user_has_tenant_access(check_tenant_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- Check if current user has access to the specified tenant
  RETURN EXISTS (
    SELECT 1 
    FROM users 
    WHERE id = auth.uid() 
    AND tenant_id = check_tenant_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION user_has_tenant_access(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION user_has_tenant_access(UUID) TO service_role;
