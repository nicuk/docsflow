-- AI Lead Router: Comprehensive Multi-Tenant Database Schema
-- This replaces Redis with production-grade Supabase database

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

-- Tenants table (replaces Redis subdomain storage)
CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  subdomain TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  industry TEXT NOT NULL CHECK (industry IN ('motorcycle_dealer', 'warehouse_distribution', 'general')),
  logo_url TEXT,
  theme JSONB DEFAULT '{}',
  settings JSONB DEFAULT '{}',
  whatsapp_config JSONB,
  email_config JSONB,
  subscription_status TEXT DEFAULT 'active',
  plan_type TEXT DEFAULT 'starter',
  user_limit INTEGER DEFAULT 5, -- Number of users allowed per plan
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Documents table for SME Data Intelligence Platform
CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  filename TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  mime_type TEXT NOT NULL,
  processing_status TEXT DEFAULT 'pending' CHECK (processing_status IN ('pending', 'processing', 'completed', 'error')),
  processing_progress INTEGER DEFAULT 0,
  error_message TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Document chunks table for RAG functionality
CREATE TABLE IF NOT EXISTS document_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
  chunk_index INTEGER NOT NULL,
  content TEXT NOT NULL,
  embedding vector(768), -- Google's text-embedding-004 produces 768-dimensional vectors
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Search history for analytics
CREATE TABLE IF NOT EXISTS search_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  query TEXT NOT NULL,
  response TEXT,
  document_ids UUID[],
  confidence_score DECIMAL,
  response_time_ms INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Users table (tenant-isolated)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT DEFAULT 'user' CHECK (role IN ('admin', 'user', 'viewer')),
  access_level INTEGER DEFAULT 1 CHECK (access_level BETWEEN 1 AND 5), -- Document access level (1=public, 5=executive)
  avatar_url TEXT,
  last_login_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(tenant_id, email)
);

-- User invitations table
CREATE TABLE user_invitations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  invited_by UUID REFERENCES users(id) ON DELETE SET NULL,
  role TEXT DEFAULT 'user' CHECK (role IN ('admin', 'user', 'viewer')),
  access_level INTEGER DEFAULT 1 CHECK (access_level BETWEEN 1 AND 5),
  token TEXT UNIQUE NOT NULL, -- Secure invitation token
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  accepted_at TIMESTAMP WITH TIME ZONE,
  accepted_by UUID REFERENCES users(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'revoked')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(tenant_id, email, status) -- Prevent duplicate pending invitations for same email
);

-- Chat conversations for SME intelligence
CREATE TABLE chat_conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  title TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Chat messages with document references
CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID REFERENCES chat_conversations(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  document_references UUID[] DEFAULT '{}', -- array of document IDs used in response
  metadata JSONB DEFAULT '{}', -- token count, model used, processing time
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Leads table (main business data)
CREATE TABLE leads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  contact_name TEXT NOT NULL,
  contact_email TEXT,
  contact_phone TEXT,
  source_channel TEXT NOT NULL CHECK (source_channel IN ('whatsapp', 'email', 'phone', 'web', 'walk_in')),
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'qualified', 'converted', 'lost')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  industry_specific_data JSONB DEFAULT '{}', -- motorcycle: bike_type, service_type; warehouse: product_type, quantity
  ai_analysis JSONB DEFAULT '{}', -- AI-generated insights and recommendations
  assigned_to UUID REFERENCES users(id),
  last_interaction_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  conversion_value DECIMAL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Lead interactions (conversation history)
CREATE TABLE lead_interactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  interaction_type TEXT NOT NULL CHECK (interaction_type IN ('message', 'call', 'email', 'meeting', 'note')),
  direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}', -- channel-specific data
  ai_response JSONB DEFAULT '{}', -- AI-generated response suggestions
  responded_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- AI routing rules (tenant-customizable)
CREATE TABLE routing_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  conditions JSONB NOT NULL, -- keywords, time, channel, etc.
  actions JSONB NOT NULL, -- assign to user, priority, auto-response
  priority INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Analytics table (business intelligence)
CREATE TABLE analytics_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL, -- lead_created, lead_converted, response_sent, etc.
  event_data JSONB NOT NULL,
  user_id UUID REFERENCES users(id),
  lead_id UUID REFERENCES leads(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- File uploads (tenant-isolated) - keeping for backward compatibility
CREATE TABLE file_uploads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER,
  uploaded_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_tenants_subdomain ON tenants(subdomain);
CREATE INDEX idx_documents_tenant_id ON documents(tenant_id);
CREATE INDEX idx_documents_category ON documents(document_category);
CREATE INDEX idx_documents_status ON documents(processing_status);
CREATE INDEX idx_users_tenant_id ON users(tenant_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_user_invitations_tenant_id ON user_invitations(tenant_id);
CREATE INDEX idx_user_invitations_token ON user_invitations(token);
CREATE INDEX idx_user_invitations_email ON user_invitations(email);
CREATE INDEX idx_user_invitations_status ON user_invitations(status);
CREATE INDEX idx_user_invitations_expires_at ON user_invitations(expires_at);
CREATE INDEX idx_chat_conversations_tenant_id ON chat_conversations(tenant_id);
CREATE INDEX idx_chat_messages_conversation_id ON chat_messages(conversation_id);
CREATE INDEX idx_leads_tenant_id ON leads(tenant_id);
CREATE INDEX idx_leads_status ON leads(status);
CREATE INDEX idx_leads_created_at ON leads(created_at);
CREATE INDEX idx_interactions_lead_id ON lead_interactions(lead_id);
CREATE INDEX idx_interactions_created_at ON lead_interactions(created_at);
CREATE INDEX idx_analytics_tenant_id ON analytics_events(tenant_id);
CREATE INDEX idx_analytics_event_type ON analytics_events(event_type);

-- Row Level Security (RLS) for tenant isolation
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE routing_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE file_uploads ENABLE ROW LEVEL SECURITY;

-- RLS Policies (ensuring complete tenant data isolation)
-- Tenants can only see their own data
CREATE POLICY "Tenants can view own data" ON tenants
  FOR ALL USING (id = auth.jwt() ->> 'tenant_id'::uuid);

-- Documents tenant isolation
CREATE POLICY "Documents tenant isolation" ON documents
  FOR ALL USING (tenant_id = auth.jwt() ->> 'tenant_id'::uuid);

-- Chat conversations tenant isolation  
CREATE POLICY "Chat conversations tenant isolation" ON chat_conversations
  FOR ALL USING (tenant_id = auth.jwt() ->> 'tenant_id'::uuid);

-- Chat messages tenant isolation
CREATE POLICY "Chat messages tenant isolation" ON chat_messages
  FOR ALL USING (tenant_id = auth.jwt() ->> 'tenant_id'::uuid);

-- Users can only see data from their tenant
CREATE POLICY "Users can view tenant data" ON users
  FOR ALL USING (tenant_id = auth.jwt() ->> 'tenant_id'::uuid);

-- User invitations tenant isolation
CREATE POLICY "User invitations tenant isolation" ON user_invitations
  FOR ALL USING (tenant_id = auth.jwt() ->> 'tenant_id'::uuid);

CREATE POLICY "Leads tenant isolation" ON leads
  FOR ALL USING (tenant_id = auth.jwt() ->> 'tenant_id'::uuid);

CREATE POLICY "Interactions tenant isolation" ON lead_interactions
  FOR ALL USING (tenant_id = auth.jwt() ->> 'tenant_id'::uuid);

CREATE POLICY "Routing rules tenant isolation" ON routing_rules
  FOR ALL USING (tenant_id = auth.jwt() ->> 'tenant_id'::uuid);

CREATE POLICY "Analytics tenant isolation" ON analytics_events
  FOR ALL USING (tenant_id = auth.jwt() ->> 'tenant_id'::uuid);

CREATE POLICY "File uploads tenant isolation" ON file_uploads
  FOR ALL USING (tenant_id = auth.jwt() ->> 'tenant_id'::uuid);

-- Sample data for testing SME Data Intelligence Platform
INSERT INTO tenants (subdomain, name, industry, theme, settings, user_limit) VALUES 
('mrtee', 'Mr. Tee Motorcycles', 'motorcycle_dealer', 
 '{"primary": "orange", "secondary": "blue", "accent": "yellow"}',
 '{"businessHours": "9AM-6PM", "timezone": "UTC", "slaTarget": 30}', 10),
('apexdist', 'Apex Distribution', 'warehouse_distribution',
 '{"primary": "blue", "secondary": "gray", "accent": "green"}',
 '{"businessHours": "8AM-5PM", "timezone": "UTC", "slaTarget": 60}', 25),
('sme-demo', 'SME Demo Company', 'general',
 '{"primary": "green", "secondary": "gray", "accent": "blue"}',
 '{"businessHours": "9AM-5PM", "timezone": "UTC", "aiEnabled": true}', 5);

-- Sample leads data
INSERT INTO leads (tenant_id, contact_name, contact_email, contact_phone, source_channel, status, priority, industry_specific_data) 
SELECT 
  t.id,
  'John Smith',
  'john@email.com', 
  '+1234567890',
  'whatsapp',
  'new',
  'high',
  CASE WHEN t.industry = 'motorcycle_dealer' 
    THEN '{"bike_type": "cruiser", "service_type": "maintenance"}'::jsonb
    ELSE '{"product_type": "electronics", "quantity": 500}'::jsonb
  END
FROM tenants t
WHERE t.subdomain IN ('mrtee', 'apexdist');

-- Functions for common operations
CREATE OR REPLACE FUNCTION get_tenant_stats(tenant_uuid UUID)
RETURNS TABLE (
  total_leads INTEGER,
  new_leads INTEGER,
  converted_leads INTEGER,
  avg_response_time INTERVAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::INTEGER as total_leads,
    COUNT(*) FILTER (WHERE status = 'new')::INTEGER as new_leads,
    COUNT(*) FILTER (WHERE status = 'converted')::INTEGER as converted_leads,
    AVG(EXTRACT(EPOCH FROM (responded_at - created_at)) * INTERVAL '1 second') as avg_response_time
  FROM leads l
  LEFT JOIN lead_interactions li ON l.id = li.lead_id AND li.direction = 'outbound'
  WHERE l.tenant_id = tenant_uuid;
END;
$$ LANGUAGE plpgsql;

-- Function to get document statistics for SME platform
CREATE OR REPLACE FUNCTION get_document_stats(tenant_uuid UUID)
RETURNS TABLE (
  total_documents INTEGER,
  documents_by_category JSONB,
  processing_status_counts JSONB,
  total_storage_mb NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::INTEGER as total_documents,
    jsonb_object_agg(COALESCE(document_category, 'uncategorized'), category_count) as documents_by_category,
    jsonb_object_agg(processing_status, status_count) as processing_status_counts,
    ROUND(SUM(COALESCE(file_size, 0))::NUMERIC / 1048576, 2) as total_storage_mb
  FROM (
    SELECT 
      document_category,
      processing_status,
      file_size,
      COUNT(*) OVER (PARTITION BY document_category) as category_count,
      COUNT(*) OVER (PARTITION BY processing_status) as status_count
    FROM documents 
    WHERE tenant_id = tenant_uuid
  ) d;
END;
$$ LANGUAGE plpgsql; 

-- Enable the pgvector extension if not already enabled
CREATE EXTENSION IF NOT EXISTS vector;

-- Create the similarity_search function
CREATE OR REPLACE FUNCTION similarity_search(
  query_embedding vector(768),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 5,
  tenant_id text DEFAULT NULL,
  access_level int DEFAULT 1
)
RETURNS TABLE (
  id uuid,
  content text,
  similarity float,
  document_id uuid,
  chunk_index int
)
LANGUAGE sql STABLE
AS $$
  SELECT
    dc.id,
    dc.content,
    1 - (dc.embedding <=> query_embedding) as similarity,
    dc.document_id,
    dc.chunk_index
  FROM document_chunks as dc
  WHERE 
    (tenant_id IS NULL OR dc.metadata->>'tenant_id' = tenant_id)
    AND dc.access_level <= access_level
    AND 1 - (dc.embedding <=> query_embedding) > match_threshold
  ORDER BY dc.embedding <=> query_embedding
  LIMIT match_count;
$$;

-- Add access_level to document_chunks if it doesn't exist
ALTER TABLE document_chunks
ADD COLUMN IF NOT EXISTS access_level INTEGER NOT NULL DEFAULT 1 CHECK (access_level BETWEEN 1 AND 5);

-- Function to check tenant user limits
CREATE OR REPLACE FUNCTION check_user_limit(tenant_uuid UUID)
RETURNS TABLE (
  current_users INTEGER,
  user_limit INTEGER,
  can_add_user BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(u.id)::INTEGER as current_users,
    t.user_limit,
    (COUNT(u.id) < t.user_limit) as can_add_user
  FROM tenants t
  LEFT JOIN users u ON t.id = u.tenant_id
  WHERE t.id = tenant_uuid
  GROUP BY t.id, t.user_limit;
END;
$$ LANGUAGE plpgsql;

-- Function to create invitation token
CREATE OR REPLACE FUNCTION generate_invitation_token()
RETURNS TEXT AS $$
BEGIN
  RETURN encode(gen_random_bytes(32), 'base64url');
END;
$$ LANGUAGE plpgsql;

-- Function to cleanup expired invitations
CREATE OR REPLACE FUNCTION cleanup_expired_invitations()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  UPDATE user_invitations 
  SET status = 'expired'
  WHERE status = 'pending' 
    AND expires_at < NOW();
    
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql; 