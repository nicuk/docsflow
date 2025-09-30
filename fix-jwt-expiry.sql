-- ============================================
-- FIX JWT EXPIRY VIA SQL
-- Set JWT expiration to 1 hour (3600 seconds)
-- ============================================

-- Check current auth config
SELECT * FROM auth.config;

-- Note: JWT expiry is typically controlled by environment variables
-- in Supabase, not database settings. If the above returns nothing
-- or doesn't show JWT settings, the issue needs to be fixed via
-- Supabase Dashboard or support ticket.

-- Alternative: Check if there's a custom JWT expiry in pg_settings
SELECT name, setting 
FROM pg_settings 
WHERE name LIKE '%jwt%' OR name LIKE '%token%';

