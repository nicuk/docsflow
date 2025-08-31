-- SAML SSO Configuration Schema Extension
-- Add SAML configuration to existing tenants table

-- Add SAML configuration columns to tenants table
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS saml_config JSONB DEFAULT '{}';

-- Create dedicated SAML configuration table for better organization
CREATE TABLE IF NOT EXISTS tenant_saml_configs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Identity Provider Details
  idp_entity_id TEXT NOT NULL,
  idp_sso_url TEXT NOT NULL,
  idp_certificate TEXT NOT NULL, -- X.509 certificate for signature validation
  idp_metadata_url TEXT, -- Optional: URL to fetch IdP metadata
  
  -- Service Provider Details  
  sp_entity_id TEXT NOT NULL DEFAULT 'docsflow-app',
  sp_acs_url TEXT NOT NULL, -- Assertion Consumer Service URL
  sp_sls_url TEXT, -- Single Logout Service URL (optional)
  
  -- SAML Configuration Options
  name_id_format TEXT DEFAULT 'urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress',
  want_assertions_signed BOOLEAN DEFAULT true,
  want_name_id BOOLEAN DEFAULT true,
  allow_unencrypted_assertions BOOLEAN DEFAULT false,
  
  -- Attribute Mapping
  attribute_mapping JSONB DEFAULT '{
    "email": "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress",
    "firstName": "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/givenname", 
    "lastName": "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/surname",
    "displayName": "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name"
  }',
  
  -- Auto-provisioning settings
  auto_provision_users BOOLEAN DEFAULT true,
  default_role TEXT DEFAULT 'user' CHECK (default_role IN ('admin', 'user', 'viewer')),
  default_access_level INTEGER DEFAULT 2 CHECK (default_access_level >= 1 AND default_access_level <= 10),
  
  -- Status and metadata
  is_enabled BOOLEAN DEFAULT false,
  is_configured BOOLEAN DEFAULT false, -- True when all required fields are set
  
  -- Audit fields
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  
  -- Ensure one SAML config per tenant
  UNIQUE(tenant_id)
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_tenant_saml_configs_tenant_id ON tenant_saml_configs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_saml_configs_enabled ON tenant_saml_configs(tenant_id, is_enabled) WHERE is_enabled = true;

-- Row Level Security
ALTER TABLE tenant_saml_configs ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Only tenant admins can manage SAML config
CREATE POLICY "Tenant admins can view SAML config" ON tenant_saml_configs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.tenant_id = tenant_saml_configs.tenant_id 
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Tenant admins can modify SAML config" ON tenant_saml_configs
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.tenant_id = tenant_saml_configs.tenant_id 
      AND users.role = 'admin'
    )
  );

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_tenant_saml_configs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_tenant_saml_configs_updated_at
  BEFORE UPDATE ON tenant_saml_configs
  FOR EACH ROW
  EXECUTE FUNCTION update_tenant_saml_configs_updated_at();
