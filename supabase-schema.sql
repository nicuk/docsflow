-- AI Lead Router: Comprehensive Multi-Tenant Database Schema
-- This replaces Redis with production-grade Supabase database

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

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
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Users table (tenant-isolated)
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

-- File uploads (tenant-isolated)
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
CREATE INDEX idx_leads_tenant_id ON leads(tenant_id);
CREATE INDEX idx_leads_status ON leads(status);
CREATE INDEX idx_leads_created_at ON leads(created_at);
CREATE INDEX idx_interactions_lead_id ON lead_interactions(lead_id);
CREATE INDEX idx_interactions_created_at ON lead_interactions(created_at);
CREATE INDEX idx_analytics_tenant_id ON analytics_events(tenant_id);
CREATE INDEX idx_analytics_event_type ON analytics_events(event_type);

-- Row Level Security (RLS) for tenant isolation
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE routing_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE file_uploads ENABLE ROW LEVEL SECURITY;

-- RLS Policies (ensuring complete tenant data isolation)
-- Tenants can only see their own data
CREATE POLICY "Tenants can view own data" ON tenants
  FOR ALL USING (id = auth.jwt() ->> 'tenant_id'::uuid);

-- Users can only see data from their tenant
CREATE POLICY "Users can view tenant data" ON users
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

-- Sample data for testing
INSERT INTO tenants (subdomain, name, industry, theme, settings) VALUES 
('mrtee', 'Mr. Tee Motorcycles', 'motorcycle_dealer', 
 '{"primary": "orange", "secondary": "blue", "accent": "yellow"}',
 '{"businessHours": "9AM-6PM", "timezone": "UTC", "slaTarget": 30}'),
('apexdist', 'Apex Distribution', 'warehouse_distribution',
 '{"primary": "blue", "secondary": "gray", "accent": "green"}',
 '{"businessHours": "8AM-5PM", "timezone": "UTC", "slaTarget": 60}');

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