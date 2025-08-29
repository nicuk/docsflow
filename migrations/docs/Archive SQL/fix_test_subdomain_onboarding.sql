-- Fix for test subdomain infinite loop issue
-- Check and fix onboarding status for test tenant

-- 1. Check current state of test tenant and user
SELECT 
    u.id as user_id,
    u.email,
    u.tenant_id,
    t.subdomain,
    t.name as tenant_name,
    EXISTS(
        SELECT 1 FROM onboarding_responses 
        WHERE user_id = u.id
    ) as has_onboarding_responses
FROM users u
LEFT JOIN tenants t ON u.tenant_id = t.id
WHERE u.email = 'coolnck2003@yahoo.com';

-- 2. Check if onboarding_responses exists for this user
SELECT * FROM onboarding_responses 
WHERE user_id = (SELECT id FROM users WHERE email = 'coolnck2003@yahoo.com');

-- 3. If no onboarding responses exist, create them to fix the loop
INSERT INTO onboarding_responses (user_id, tenant_id, responses, created_at, updated_at)
SELECT 
    u.id,
    u.tenant_id,
    jsonb_build_object(
        'company_name', 'test',
        'industry', 'general',
        'business_type', 'General Business',
        'team_size', '1-10',
        'primary_use_case', 'Document Management',
        'onboarding_complete', true
    ),
    NOW(),
    NOW()
FROM users u
WHERE u.email = 'coolnck2003@yahoo.com'
AND NOT EXISTS (
    SELECT 1 FROM onboarding_responses 
    WHERE user_id = u.id
)
ON CONFLICT (user_id) DO UPDATE
SET 
    responses = EXCLUDED.responses,
    updated_at = NOW();

-- 4. Verify the fix
SELECT 
    u.email,
    u.tenant_id,
    t.subdomain,
    or.responses->>'company_name' as company_name,
    or.responses->>'onboarding_complete' as onboarding_complete
FROM users u
LEFT JOIN tenants t ON u.tenant_id = t.id
LEFT JOIN onboarding_responses or ON u.id = or.user_id
WHERE u.email = 'coolnck2003@yahoo.com';
