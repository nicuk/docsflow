-- Check if the similarity_search function has the NEW signature with metadata
SELECT 
  proname as function_name,
  pg_get_function_result(oid) as return_type,
  pg_get_function_arguments(oid) as arguments
FROM pg_proc
WHERE proname = 'similarity_search'
  AND pronamespace = 'public'::regnamespace;

-- Test if it actually returns filename
DO $$
DECLARE
  test_result RECORD;
  test_embedding vector(768);
BEGIN
  -- Create a dummy embedding (all zeros)
  test_embedding := array_fill(0, ARRAY[768])::vector(768);
  
  -- Try to call the function and see what it returns
  SELECT * INTO test_result
  FROM similarity_search(test_embedding, 0.0, 1)
  LIMIT 1;
  
  -- Check if filename column exists in the result
  RAISE NOTICE 'Test query executed. Check if filename field is present in the function output.';
  
  IF test_result IS NOT NULL THEN
    RAISE NOTICE '✅ Function returned a result';
  ELSE
    RAISE NOTICE '⚠️ Function returned no results (might be empty database)';
  END IF;
END $$;

