-- Check user's tenant association
-- Run this in Supabase SQL Editor

-- 1. Check the user's tenant_id
SELECT 
  id, 
  email, 
  tenant_id, 
  access_level,
  created_at
FROM users 
WHERE id = 'cc362aeb-bf97-4260-9dfb-bb1725c9c202'
   OR email = 'support@bitto.tech';

-- 2. Check the tenant details
SELECT 
  id,
  subdomain,
  name,
  created_at
FROM tenants
WHERE subdomain = 'bitto';

-- 3. Check documents for this user
SELECT 
  d.id,
  d.filename,
  d.tenant_id,
  d.created_at,
  t.subdomain as tenant_subdomain
FROM documents d
LEFT JOIN tenants t ON d.tenant_id = t.id
WHERE d.tenant_id IN (
  SELECT tenant_id FROM users WHERE email = 'support@bitto.tech'
);

-- 4. Count documents by tenant
SELECT 
  t.subdomain,
  t.id as tenant_uuid,
  COUNT(d.id) as document_count
FROM tenants t
LEFT JOIN documents d ON d.tenant_id = t.id
WHERE t.subdomain = 'bitto'
GROUP BY t.id, t.subdomain;

