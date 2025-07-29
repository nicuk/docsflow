-- AI Lead Router: Production-Ready Supabase Schema
-- Execute this ENTIRE file in Supabase SQL Editor
-- Estimated execution time: 2-3 minutes

-- ===============================================
-- PHASE 1: EXTENSIONS (MUST BE FIRST)
-- ===============================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

-- ===============================================
-- PHASE 2: CORE TABLES
-- ===============================================

-- Tenants table (Foundation)
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
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Users table (Tenant-isolated)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT DEFAULT 'user' CHECK (role IN ('admin', 'user', 'viewer')),
  avatar_url TEXT,
  last_login_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(tenant_id, email)
);

-- Documents table
CREATE TABLE documents (
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

-- Document chunks table (RAG Core)
CREATE TABLE document_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
  chunk_index INTEGER NOT NULL,
  content TEXT NOT NULL,
  embedding vector(768), -- Google text-embedding-004
  metadata JSONB DEFAULT '{}',
  access_level INTEGER NOT NULL DEFAULT 1 CHECK (access_level BETWEEN 1 AND 5),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Search history for analytics
CREATE TABLE search_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  query TEXT NOT NULL,
  response TEXT,
  document_ids UUID[],
  confidence_score DECIMAL,
  response_time_ms INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Chat conversations
CREATE TABLE chat_conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  title TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Chat messages
CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID REFERENCES chat_conversations(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  document_references UUID[] DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Leads table
CREATE TABLE leads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  contact_name TEXT NOT NULL,
  contact_email TEXT,
  contact_phone TEXT,
  source_channel TEXT NOT NULL CHECK (source_channel IN ('whatsapp', 'email', 'phone', 'web', 'walk_in')),
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'qualified', 'converted', 'lost')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  industry_specific_data JSONB DEFAULT '{}',
  ai_analysis JSONB DEFAULT '{}',
  assigned_to UUID REFERENCES users(id),
  last_interaction_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  conversion_value DECIMAL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Lead interactions
CREATE TABLE lead_interactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  interaction_type TEXT NOT NULL CHECK (interaction_type IN ('message', 'call', 'email', 'meeting', 'note')),
  direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  ai_response JSONB DEFAULT '{}',
  responded_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- AI routing rules
CREATE TABLE routing_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  conditions JSONB NOT NULL,
  actions JSONB NOT NULL,
  priority INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Analytics events
CREATE TABLE analytics_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  event_data JSONB NOT NULL,
  user_id UUID REFERENCES users(id),
  lead_id UUID REFERENCES leads(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- File uploads
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

-- ===============================================
-- PHASE 3: PERFORMANCE INDEXES
-- ===============================================
CREATE INDEX idx_tenants_subdomain ON tenants(subdomain);
CREATE INDEX idx_documents_tenant_id ON documents(tenant_id);
CREATE INDEX idx_documents_status ON documents(processing_status);
CREATE INDEX idx_document_chunks_document_id ON document_chunks(document_id);
CREATE INDEX idx_document_chunks_access_level ON document_chunks(access_level);
CREATE INDEX idx_chat_conversations_tenant_id ON chat_conversations(tenant_id);
CREATE INDEX idx_chat_messages_conversation_id ON chat_messages(conversation_id);
CREATE INDEX idx_leads_tenant_id ON leads(tenant_id);
CREATE INDEX idx_leads_status ON leads(status);
CREATE INDEX idx_leads_created_at ON leads(created_at);
CREATE INDEX idx_interactions_lead_id ON lead_interactions(lead_id);
CREATE INDEX idx_interactions_created_at ON lead_interactions(created_at);
CREATE INDEX idx_analytics_tenant_id ON analytics_events(tenant_id);
CREATE INDEX idx_analytics_event_type ON analytics_events(event_type);

-- ===============================================
-- PHASE 4: ROW LEVEL SECURITY
-- ===============================================
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE search_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE routing_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE file_uploads ENABLE ROW LEVEL SECURITY;

-- RLS Policies (Service Role Access)
CREATE POLICY "Service role access" ON tenants FOR ALL TO service_role USING (true);
CREATE POLICY "Service role access" ON documents FOR ALL TO service_role USING (true);
CREATE POLICY "Service role access" ON document_chunks FOR ALL TO service_role USING (true);
CREATE POLICY "Service role access" ON search_history FOR ALL TO service_role USING (true);
CREATE POLICY "Service role access" ON chat_conversations FOR ALL TO service_role USING (true);
CREATE POLICY "Service role access" ON chat_messages FOR ALL TO service_role USING (true);
CREATE POLICY "Service role access" ON users FOR ALL TO service_role USING (true);
CREATE POLICY "Service role access" ON leads FOR ALL TO service_role USING (true);
CREATE POLICY "Service role access" ON lead_interactions FOR ALL TO service_role USING (true);
CREATE POLICY "Service role access" ON routing_rules FOR ALL TO service_role USING (true);
CREATE POLICY "Service role access" ON analytics_events FOR ALL TO service_role USING (true);
CREATE POLICY "Service role access" ON file_uploads FOR ALL TO service_role USING (true);

-- ===============================================
-- PHASE 5: VECTOR SEARCH FUNCTION
-- ===============================================
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
    (similarity_search.tenant_id IS NULL OR dc.metadata->>'tenant_id' = similarity_search.tenant_id)
    AND dc.access_level <= similarity_search.access_level
    AND 1 - (dc.embedding <=> query_embedding) > match_threshold
  ORDER BY dc.embedding <=> query_embedding
  LIMIT match_count;
$$;

-- ===============================================
-- PHASE 6: ANALYTICS FUNCTIONS
-- ===============================================
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

-- ===============================================
-- PHASE 7: SAMPLE DATA
-- ===============================================
INSERT INTO tenants (subdomain, name, industry, theme, settings) VALUES 
('mrtee', 'Mr. Tee Motorcycles', 'motorcycle_dealer', 
 '{"primary": "orange", "secondary": "blue", "accent": "yellow"}',
 '{"businessHours": "9AM-6PM", "timezone": "UTC", "slaTarget": 30}'),
('apexdist', 'Apex Distribution', 'warehouse_distribution',
 '{"primary": "blue", "secondary": "gray", "accent": "green"}',
 '{"businessHours": "8AM-5PM", "timezone": "UTC", "slaTarget": 60}'),
('sme-demo', 'SME Demo Company', 'general',
 '{"primary": "green", "secondary": "gray", "accent": "blue"}',
 '{"businessHours": "9AM-5PM", "timezone": "UTC", "aiEnabled": true}');

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

-- ===============================================
-- IMPLEMENTATION COMPLETE!
-- ===============================================
-- Verify with: SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';
-- Should show 11 tables: tenants, users, documents, document_chunks, search_history, 
-- chat_conversations, chat_messages, leads, lead_interactions, routing_rules, 
-- analytics_events, file_uploads 