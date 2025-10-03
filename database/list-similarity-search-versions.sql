-- List all versions of similarity_search function
-- This shows why we got the "function name not unique" error

SELECT 
  p.oid::regprocedure as function_signature,
  pg_get_function_arguments(p.oid) as arguments,
  pg_get_function_result(p.oid) as return_type,
  p.prosrc as source_code_preview
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname = 'similarity_search'
ORDER BY p.oid;

-- Show count
SELECT 
  COUNT(*) as total_versions,
  'versions of similarity_search found' as note
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname = 'similarity_search';

