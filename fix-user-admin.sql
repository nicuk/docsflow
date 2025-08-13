-- Manual fix for user admin assignment
-- This will assign the user to the bitto tenant as admin

-- First, let's see the current state
SELECT 
  u.id as user_id,
  u.email,
  u.tenant_id,
  u.role,
  u.access_level,
  t.id as tenant_uuid,
  t.subdomain as tenant_subdomain
FROM users u
LEFT JOIN tenants t ON u.tenant_id = t.id
WHERE u.email = 'support@bitto.tech';

-- Update the user to be admin of the bitto tenant
UPDATE users 
SET 
  tenant_id = (SELECT id FROM tenants WHERE subdomain = 'bitto'),
  role = 'admin',
  access_level = 5
WHERE email = 'support@bitto.tech';

-- Verify the update worked
SELECT 
  u.id as user_id,
  u.email,
  u.tenant_id,
  u.role,
  u.access_level,
  t.id as tenant_uuid,
  t.subdomain as tenant_subdomain
FROM users u
LEFT JOIN tenants t ON u.tenant_id = t.id
WHERE u.email = 'support@bitto.tech';
