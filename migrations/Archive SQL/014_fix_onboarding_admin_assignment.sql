-- ===============================================
-- FIX: Onboarding Admin Assignment
-- 
-- ISSUE: Onboarding function creates admin role but doesn't set access_level=1
-- RESULT: New tenant creators get admin role but access_level=2 (wrong!)
-- ===============================================

-- Update the atomic onboarding function to properly assign access_level=1 for admins
CREATE OR REPLACE FUNCTION complete_onboarding_atomic(
  p_user_id UUID,
  p_responses JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_tenant_id UUID;
  v_result JSONB;
  v_subdomain TEXT;
  v_business_name TEXT;
  v_industry TEXT;
BEGIN
  -- Extract values from responses
  v_subdomain := p_responses->>'subdomain';
  v_business_name := p_responses->>'business_name';
  v_industry := COALESCE(p_responses->>'industry', 'general');
  
  -- Validate required fields
  IF v_subdomain IS NULL OR v_business_name IS NULL THEN
    RAISE EXCEPTION 'Subdomain and business name are required';
  END IF;
  
  -- Check if subdomain already exists
  SELECT id INTO v_tenant_id FROM tenants WHERE subdomain = v_subdomain LIMIT 1;
  
  IF v_tenant_id IS NOT NULL THEN
    RAISE EXCEPTION 'Subdomain already exists: %', v_subdomain;
  END IF;
  
  -- Map industry to allowed values
  CASE 
    WHEN LOWER(v_industry) LIKE '%motorcycle%' OR LOWER(v_industry) LIKE '%dealer%' THEN
      v_industry := 'motorcycle_dealer';
    WHEN LOWER(v_industry) LIKE '%warehouse%' OR LOWER(v_industry) LIKE '%distribution%' OR LOWER(v_industry) LIKE '%logistics%' THEN
      v_industry := 'warehouse_distribution';
    ELSE
      v_industry := 'general';
  END CASE;
  
  -- Generate new tenant ID
  v_tenant_id := gen_random_uuid();
  
  -- Create tenant
  INSERT INTO tenants (
    id,
    subdomain,
    name,
    industry,
    created_at,
    updated_at
  ) VALUES (
    v_tenant_id,
    v_subdomain,
    v_business_name,
    v_industry,
    NOW(),
    NOW()
  );
  
  -- 🔥 CRITICAL FIX: Update user with tenant_id, admin role AND access_level=1
  UPDATE users
  SET 
    tenant_id = v_tenant_id,
    role = 'admin',
    access_level = 1  -- 🚨 THIS WAS MISSING! Admin level in new 1-2 system
  WHERE id = p_user_id;
  
  -- Store onboarding responses
  INSERT INTO onboarding_responses (
    user_id,
    tenant_id,
    responses,
    created_at,
    updated_at
  ) VALUES (
    p_user_id,
    v_tenant_id,
    p_responses,
    NOW(),
    NOW()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    responses = EXCLUDED.responses,
    updated_at = NOW();
  
  -- Return success result
  v_result := jsonb_build_object(
    'success', true,
    'tenant_id', v_tenant_id,
    'subdomain', v_subdomain,
    'user_access_level', 1  -- Confirm admin level
  );
  
  RETURN v_result;
  
EXCEPTION
  WHEN OTHERS THEN
    -- Return error result
    v_result := jsonb_build_object(
      'success', false,
      'error', SQLERRM
    );
    RETURN v_result;
END $$;

-- Also fix any existing admin users who have wrong access level
UPDATE users 
SET access_level = 1 
WHERE role = 'admin' AND access_level != 1;

-- Log the fix
INSERT INTO analytics_events (
  tenant_id, 
  event_type, 
  event_data,
  created_at
) 
SELECT 
  u.tenant_id,
  'onboarding_admin_fix',
  jsonb_build_object(
    'migration', '014_fix_onboarding_admin_assignment',
    'user_id', u.id,
    'email', u.email,
    'issue_fixed', 'admin_gets_access_level_1_on_onboarding'
  ),
  NOW()
FROM users u
WHERE u.role = 'admin';

-- ===============================================
-- ONBOARDING ADMIN ASSIGNMENT FIX COMPLETE
-- 
-- ✅ New tenant creators now get access_level = 1 automatically
-- ✅ Existing admin users with wrong access level fixed
-- ✅ Future onboarding will work correctly
-- ===============================================
