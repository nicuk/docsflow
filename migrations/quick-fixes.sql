-- QUICK FIXES FOR DEMO READINESS
-- Run this after the main schema to fix critical issues

-- 1. Fix data type inconsistencies (CRITICAL)
-- Update tenant_id columns to be UUID instead of TEXT
ALTER TABLE documents 
  ALTER COLUMN tenant_id TYPE UUID USING tenant_id::UUID,
  ADD CONSTRAINT documents_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES tenants(id);

ALTER TABLE search_history 
  ALTER COLUMN tenant_id TYPE UUID USING tenant_id::UUID,
  ADD CONSTRAINT search_history_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES tenants(id);

-- 2. Add missing document_category column (indexes reference this)
ALTER TABLE documents 
  ADD COLUMN IF NOT EXISTS document_category TEXT DEFAULT 'general';

-- 3. Update document_chunks to have proper tenant reference
ALTER TABLE document_chunks 
  ADD COLUMN IF NOT EXISTS tenant_id UUID,
  ADD CONSTRAINT document_chunks_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES tenants(id);

-- 4. Add basic session management for demo
CREATE TABLE IF NOT EXISTS user_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  session_token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Add simple notifications for demo
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'info' CHECK (type IN ('info', 'success', 'warning', 'error')),
  status TEXT DEFAULT 'unread' CHECK (status IN ('unread', 'read')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Add basic API usage tracking (simplified for demo)
CREATE TABLE IF NOT EXISTS api_usage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  endpoint TEXT NOT NULL,
  method TEXT NOT NULL,
  status_code INTEGER,
  response_time_ms INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add RLS to new tables
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_usage ENABLE ROW LEVEL SECURITY;

-- RLS Policies for new tables
CREATE POLICY "User sessions tenant isolation" ON user_sessions
  FOR ALL USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

CREATE POLICY "Notifications tenant isolation" ON notifications
  FOR ALL USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

CREATE POLICY "API usage tenant isolation" ON api_usage
  FOR ALL USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_sessions_tenant_id ON user_sessions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_notifications_tenant_id ON notifications(tenant_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id, status);
CREATE INDEX IF NOT EXISTS idx_api_usage_tenant_id ON api_usage(tenant_id);
CREATE INDEX IF NOT EXISTS idx_api_usage_created_at ON api_usage(created_at);

-- Update document_chunks with tenant_id for existing records
UPDATE document_chunks 
SET tenant_id = d.tenant_id 
FROM documents d 
WHERE document_chunks.document_id = d.id AND document_chunks.tenant_id IS NULL;

-- Function to create simple notifications
CREATE OR REPLACE FUNCTION create_notification(
  p_tenant_id UUID,
  p_user_id UUID,
  p_title TEXT,
  p_message TEXT,
  p_type TEXT DEFAULT 'info'
)
RETURNS UUID AS $$
DECLARE
  notification_id UUID;
BEGIN
  INSERT INTO notifications (tenant_id, user_id, title, message, type)
  VALUES (p_tenant_id, p_user_id, p_title, p_message, p_type)
  RETURNING id INTO notification_id;
  
  RETURN notification_id;
END;
$$ LANGUAGE plpgsql; 