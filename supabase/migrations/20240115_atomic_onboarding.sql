-- Create atomic onboarding function
-- This ensures tenant creation and user update happen in a single transaction
CREATE OR REPLACE FUNCTION complete_onboarding_atomic(
  p_user_id UUID,
  p_subdomain TEXT,
  p_business_name TEXT,
  p_industry TEXT,
  p_responses JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_tenant_id UUID;
  v_existing_tenant_id UUID;
  v_result JSONB;
  v_safe_industry TEXT;
BEGIN
  -- Start transaction
  -- Check if subdomain already exists
  SELECT id INTO v_existing_tenant_id
  FROM tenants
  WHERE subdomain = p_subdomain
  LIMIT 1;
  
  IF v_existing_tenant_id IS NOT NULL THEN
    RAISE EXCEPTION 'Subdomain already exists: %', p_subdomain;
  END IF;
  
  -- Map industry to allowed values in current schema
  CASE 
    WHEN LOWER(p_industry) LIKE '%motorcycle%' OR LOWER(p_industry) LIKE '%dealer%' THEN
      v_safe_industry := 'motorcycle_dealer';
    WHEN LOWER(p_industry) LIKE '%warehouse%' OR LOWER(p_industry) LIKE '%distribution%' OR LOWER(p_industry) LIKE '%logistics%' THEN
      v_safe_industry := 'warehouse_distribution';
    ELSE
      v_safe_industry := 'general';
  END CASE;
  
  -- Generate new tenant ID
  v_tenant_id := gen_random_uuid();
  
  -- Create tenant with safe industry value
  INSERT INTO tenants (
    id,
    subdomain,
    name,
    industry,
    created_at,
    updated_at
  ) VALUES (
    v_tenant_id,
    p_subdomain,
    p_business_name,
    v_safe_industry,
    NOW(),
    NOW()
  );
  
  -- Update user with tenant_id and role
  UPDATE users
  SET 
    tenant_id = v_tenant_id,
    role = 'admin'
  WHERE id = p_user_id;
  
  -- Store onboarding responses if provided
  IF p_responses IS NOT NULL THEN
    INSERT INTO onboarding_responses (
      user_id,
      tenant_id,
      responses,
      created_at
    ) VALUES (
      p_user_id,
      v_tenant_id,
      p_responses,
      NOW()
    )
    ON CONFLICT (user_id) DO UPDATE
    SET 
      responses = p_responses,
      tenant_id = v_tenant_id,
      updated_at = NOW();
  END IF;
  
  -- Create admin access record
  INSERT INTO tenant_admins (
    tenant_id,
    user_id,
    access_level,
    created_at
  ) VALUES (
    v_tenant_id,
    p_user_id,
    5, -- Full admin access
    NOW()
  )
  ON CONFLICT (tenant_id, user_id) DO NOTHING;
  
  -- Build result
  SELECT jsonb_build_object(
    'success', true,
    'tenant', jsonb_build_object(
      'id', v_tenant_id,
      'subdomain', p_subdomain,
      'name', p_business_name,
      'industry', p_industry
    )
  ) INTO v_result;
  
  RETURN v_result;
  
EXCEPTION
  WHEN OTHERS THEN
    -- Rollback is automatic in case of exception
    RAISE;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION complete_onboarding_atomic TO authenticated;

-- Create table for onboarding responses if it doesn't exist
CREATE TABLE IF NOT EXISTS onboarding_responses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  responses JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Create table for tenant admins if it doesn't exist
CREATE TABLE IF NOT EXISTS tenant_admins (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  access_level INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, user_id)
);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_tenants_subdomain ON tenants(subdomain);
CREATE INDEX IF NOT EXISTS idx_users_tenant_id ON users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_admins_user_id ON tenant_admins(user_id);
CREATE INDEX IF NOT EXISTS idx_tenant_admins_tenant_id ON tenant_admins(tenant_id);
