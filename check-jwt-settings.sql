-- ============================================
-- CHECK JWT SETTINGS IN SUPABASE
-- ============================================

-- 1. Check JWT expiration settings
SELECT 
  name,
  setting,
  unit,
  short_desc
FROM pg_settings
WHERE name LIKE '%jwt%';

-- 2. Check if JWT secret is configured
SELECT 
  name,
  setting
FROM pg_settings
WHERE name IN ('app.settings.jwt_secret', 'app.settings.jwt_exp');

-- 3. Check current server time vs session time
SELECT 
  NOW() as current_server_time,
  EXTRACT(EPOCH FROM NOW()) as current_unix_timestamp;

-- 4. Check recent auth.sessions for support@bitto.tech
SELECT 
  u.email,
  s.created_at,
  s.updated_at,
  s.not_after,
  EXTRACT(EPOCH FROM s.not_after) as expires_unix,
  EXTRACT(EPOCH FROM NOW()) as current_unix,
  (EXTRACT(EPOCH FROM s.not_after) - EXTRACT(EPOCH FROM NOW())) / 60 as minutes_until_expiry
FROM auth.sessions s
JOIN auth.users u ON s.user_id = u.id
WHERE u.email = 'support@bitto.tech'
ORDER BY s.created_at DESC
LIMIT 5;

-- ============================================
-- EXPECTED RESULTS:
-- JWT should have 1 hour (3600 seconds) expiration by default
-- If expiration is < 5 minutes, that's the problem
-- ============================================

