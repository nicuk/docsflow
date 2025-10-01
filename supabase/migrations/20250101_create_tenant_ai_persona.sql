-- Create tenant AI persona table for customizable AI assistant personalities
-- This enables per-tenant prompt engineering and persona customization

CREATE TABLE IF NOT EXISTS tenant_ai_persona (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Persona Settings (from UI)
  role TEXT DEFAULT 'Business Intelligence Assistant',
  tone TEXT DEFAULT 'Professional and helpful',
  business_context TEXT,
  industry TEXT DEFAULT 'general',
  focus_areas TEXT[], -- Array of focus areas
  
  -- Prompt Engineering (generated from settings)
  system_prompt TEXT NOT NULL,
  custom_instructions TEXT, -- Optional custom RAG instructions
  
  -- Quality Control
  fallback_prompt TEXT NOT NULL, -- Used for gibberish/unclear input
  confidence_threshold DECIMAL DEFAULT 0.3,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_used_at TIMESTAMPTZ,
  
  -- Constraints
  UNIQUE(tenant_id)
);

-- Indexes for performance
CREATE INDEX idx_tenant_persona_tenant ON tenant_ai_persona(tenant_id);
CREATE INDEX idx_tenant_persona_industry ON tenant_ai_persona(industry);

-- Enable RLS
ALTER TABLE tenant_ai_persona ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Tenants can view own persona"
  ON tenant_ai_persona
  FOR SELECT
  USING (
    tenant_id IN (
      SELECT id FROM tenants 
      WHERE subdomain = current_setting('request.jwt.claims', true)::json->>'subdomain'
    )
  );

CREATE POLICY "Tenants can insert own persona"
  ON tenant_ai_persona
  FOR INSERT
  WITH CHECK (
    tenant_id IN (
      SELECT id FROM tenants 
      WHERE subdomain = current_setting('request.jwt.claims', true)::json->>'subdomain'
    )
  );

CREATE POLICY "Tenants can update own persona"
  ON tenant_ai_persona
  FOR UPDATE
  USING (
    tenant_id IN (
      SELECT id FROM tenants 
      WHERE subdomain = current_setting('request.jwt.claims', true)::json->>'subdomain'
    )
  );

CREATE POLICY "Service role has full access"
  ON tenant_ai_persona
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Function to auto-update updated_at
CREATE OR REPLACE FUNCTION update_tenant_persona_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_tenant_persona_timestamp
  BEFORE UPDATE ON tenant_ai_persona
  FOR EACH ROW
  EXECUTE FUNCTION update_tenant_persona_updated_at();

-- Comments for documentation
COMMENT ON TABLE tenant_ai_persona IS 'Stores customizable AI assistant personalities per tenant';
COMMENT ON COLUMN tenant_ai_persona.system_prompt IS 'Generated system prompt used by LLM';
COMMENT ON COLUMN tenant_ai_persona.fallback_prompt IS 'Response for gibberish or unclear queries';
COMMENT ON COLUMN tenant_ai_persona.confidence_threshold IS 'Minimum confidence for RAG responses';

