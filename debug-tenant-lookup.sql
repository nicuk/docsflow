-- Check what tenants exist and their subdomain vs UUID structure
SELECT 
  id as tenant_uuid,
  subdomain,
  name,
  created_at,
  CASE 
    WHEN subdomain ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' 
    THEN 'UUID_AS_SUBDOMAIN ❌' 
    ELSE 'PROPER_SUBDOMAIN ✅' 
  END as subdomain_type
FROM tenants 
ORDER BY created_at DESC 
LIMIT 10;


-- Look for tenants where subdomain is actually a UUID
SELECT 
  id,
  subdomain,
  name,
  'CORRUPTED: UUID stored as subdomain' as issue
FROM tenants 
WHERE subdomain ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';



-- Find the tenant that user support@bitto.tech should belong to
SELECT 
  t.id as tenant_uuid,
  t.subdomain,
  t.name,
  u.email,
  u.id as user_id
FROM tenants t
JOIN users u ON u.tenant_id = t.id  
WHERE u.email = 'support@bitto.tech';


-- Check if user is properly linked to a tenant
SELECT 
  u.id as user_id,
  u.email,
  u.tenant_id,
  t.subdomain,
  t.name as tenant_name,
  CASE 
    WHEN u.tenant_id IS NULL THEN 'NO_TENANT_ASSIGNED ❌'
    WHEN t.id IS NULL THEN 'TENANT_NOT_FOUND ❌'
    ELSE 'PROPERLY_LINKED ✅'
  END as link_status
FROM users u
LEFT JOIN tenants t ON t.id = u.tenant_id
WHERE u.email = 'support@bitto.tech';



first sql result
[
  {
    "tenant_uuid": "2e33ba17-ad07-44b7-ae8b-937de35e91d7",
    "subdomain": "bitto",
    "name": "bitto",
    "created_at": "2025-08-27 07:08:44.416396+00",
    "subdomain_type": "PROPER_SUBDOMAIN ✅"
  }
]

second sql result
Success. No rows returned


3rd result

[
  {
    "tenant_uuid": "2e33ba17-ad07-44b7-ae8b-937de35e91d7",
    "subdomain": "bitto",
    "name": "bitto",
    "email": "support@bitto.tech",
    "user_id": "2e67ab24-6972-42c4-a38d-3cbd10cef5eb"
  }
]

4th result
[
  {
    "user_id": "2e67ab24-6972-42c4-a38d-3cbd10cef5eb",
    "email": "support@bitto.tech",
    "tenant_id": "2e33ba17-ad07-44b7-ae8b-937de35e91d7",
    "subdomain": "bitto",
    "tenant_name": "bitto",
    "link_status": "PROPERLY_LINKED ✅"
  }
]