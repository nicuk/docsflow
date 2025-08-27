-- Create the bitto tenant for testing
-- Run this in Supabase SQL editor

-- First, check if bitto already exists
SELECT * FROM tenants WHERE subdomain = 'bitto';

-- If not exists, create it
INSERT INTO tenants (
    subdomain,
    name,
    industry,
    display_name,
    settings,
    theme,
    custom_persona
) VALUES (
    'bitto',
    'Bitto Technologies',
    'technology',
    'Bitto Tech',
    jsonb_build_object(
        'features', jsonb_build_object(
            'ai_chat', true,
            'document_processing', true,
            'analytics', true
        ),
        'limits', jsonb_build_object(
            'max_users', 100,
            'max_documents', 10000
        )
    ),
    jsonb_build_object(
        'primary_color', '#0066CC',
        'secondary_color', '#004499',
        'font_family', 'Inter'
    ),
    jsonb_build_object(
        'role', 'Technology Business Advisor',
        'focus_areas', jsonb_build_array('Operations', 'Strategy', 'Growth'),
        'tone', 'professional',
        'business_context', 'Technology company focused on innovative solutions',
        'prompt_template', 'You are a specialized technology business advisor for Bitto Tech.'
    )
) ON CONFLICT (subdomain) DO UPDATE SET
    name = EXCLUDED.name,
    industry = EXCLUDED.industry,
    display_name = EXCLUDED.display_name;

-- Verify creation
SELECT id, subdomain, name, industry, created_at FROM tenants WHERE subdomain = 'bitto';

-- Also create/update the user if needed
UPDATE users 
SET tenant_id = (SELECT id FROM tenants WHERE subdomain = 'bitto'),
    role = 'admin',
    access_level = 5
WHERE email = 'support@bitto.tech';

-- Verify user assignment
SELECT u.id, u.email, u.tenant_id, u.role, t.subdomain 
FROM users u
LEFT JOIN tenants t ON u.tenant_id = t.id
WHERE u.email = 'support@bitto.tech';
