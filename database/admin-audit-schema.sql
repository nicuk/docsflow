-- Admin Audit Log Table for Security and Compliance
-- This table tracks all admin actions for security auditing

CREATE TABLE IF NOT EXISTS admin_audit_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    admin_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    action TEXT NOT NULL,
    details JSONB DEFAULT '{}',
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_admin_user_id ON admin_audit_log(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_tenant_id ON admin_audit_log(tenant_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_timestamp ON admin_audit_log(timestamp);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_action ON admin_audit_log(action);

-- RLS Policies for admin_audit_log
ALTER TABLE admin_audit_log ENABLE ROW LEVEL SECURITY;

-- Policy: Service role has full access (for system operations)
CREATE POLICY "admin_audit_service_role_access" ON admin_audit_log
    FOR ALL TO service_role USING (true);

-- Policy: Admins can view audit logs for their tenant only
CREATE POLICY "admin_audit_tenant_admin_read" ON admin_audit_log
    FOR SELECT TO authenticated
    USING (
        tenant_id IN (
            SELECT tenant_id 
            FROM users 
            WHERE id = auth.uid() 
            AND role = 'admin'
        )
    );

-- Policy: No direct insert/update/delete for regular users (only via service role)
-- This ensures audit log integrity

-- Comments for documentation
COMMENT ON TABLE admin_audit_log IS 'Audit log for all admin actions across tenants for security and compliance';
COMMENT ON COLUMN admin_audit_log.admin_user_id IS 'ID of the admin user who performed the action';
COMMENT ON COLUMN admin_audit_log.tenant_id IS 'ID of the tenant where the action was performed';
COMMENT ON COLUMN admin_audit_log.action IS 'Description of the admin action performed';
COMMENT ON COLUMN admin_audit_log.details IS 'Additional details about the action in JSON format';
COMMENT ON COLUMN admin_audit_log.timestamp IS 'When the action was performed';
COMMENT ON COLUMN admin_audit_log.ip_address IS 'IP address of the admin user (if available)';
COMMENT ON COLUMN admin_audit_log.user_agent IS 'User agent of the admin user (if available)';
