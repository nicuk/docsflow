-- Quick RAG Quality Check
-- Identifies tenant isolation issues, semantic mismatch, and confidence problems

-- ========================================
-- CHECK 1: Tenant Isolation Test
-- ========================================
SELECT '=== TENANT ISOLATION CHECK ===' as test;

-- Show which tenants have documents
SELECT 
  t.subdomain,
  t.id::text as tenant_id,
  COUNT(DISTINCT d.id) as doc_count,
  COUNT(dc.id) as chunk_count
FROM tenants t
LEFT JOIN documents d ON d.tenant_id = t.id
LEFT JOIN document_chunks dc ON dc.document_id = d.id
GROUP BY t.id, t.subdomain
ORDER BY doc_count DESC;

-- ========================================
-- CHECK 2: Cross-Tenant Leakage Test
-- ========================================
SELECT '=== CROSS-TENANT LEAKAGE CHECK ===' as test;

-- Check if document_chunks.tenant_id matches documents.tenant_id
SELECT 
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ No tenant mismatches found'
    ELSE '🚨 CRITICAL: Found ' || COUNT(*) || ' chunks with mismatched tenant_id!'
  END as result
FROM document_chunks dc
JOIN documents d ON d.id = dc.document_id
WHERE dc.tenant_id != d.tenant_id;

-- Show mismatches if any
SELECT 
  dc.id as chunk_id,
  dc.tenant_id::text as chunk_tenant,
  d.tenant_id::text as doc_tenant,
  d.filename
FROM document_chunks dc
JOIN documents d ON d.id = dc.document_id
WHERE dc.tenant_id != d.tenant_id
LIMIT 10;

-- ========================================
-- CHECK 3: Embedding Quality Check
-- ========================================
SELECT '=== EMBEDDING QUALITY CHECK ===' as test;

SELECT 
  COUNT(*) as total_chunks,
  COUNT(embedding) as chunks_with_embeddings,
  ROUND(100.0 * COUNT(embedding) / NULLIF(COUNT(*), 0), 1) as embedding_coverage_pct,
  CASE 
    WHEN COUNT(embedding) = 0 THEN '❌ No embeddings - RAG will not work!'
    WHEN COUNT(embedding) < COUNT(*) * 0.5 THEN '⚠️ Less than 50% embedded - many queries will fail'
    WHEN COUNT(embedding) < COUNT(*) THEN '⚠️ Some chunks missing embeddings'
    ELSE '✅ All chunks have embeddings'
  END as status
FROM document_chunks;

-- ========================================
-- CHECK 4: Test Similarity Search with Real Query
-- ========================================
SELECT '=== SIMILARITY SEARCH TEST ===' as test;

DO $$
DECLARE
  test_query text := 'avengers';
  sample_embedding vector(768);
  result_record RECORD;
  expected_tenant uuid;
  found_tenant uuid;
  mismatch_count int := 0;
BEGIN
  -- Get embedding for a chunk that contains "avengers"
  SELECT dc.embedding, d.tenant_id INTO sample_embedding, expected_tenant
  FROM document_chunks dc
  JOIN documents d ON d.id = dc.document_id
  WHERE dc.content ILIKE '%avengers%'
  LIMIT 1;
  
  IF sample_embedding IS NOT NULL THEN
    RAISE NOTICE '🔍 Testing query: "%"', test_query;
    RAISE NOTICE '   Expected tenant: %', expected_tenant;
    RAISE NOTICE '---';
    
    -- Run similarity_search
    FOR result_record IN 
      SELECT * FROM similarity_search(
        sample_embedding,
        0.3,  -- Low threshold
        10,   -- Top 10
        expected_tenant::text,  -- Filter by expected tenant
        1
      )
    LOOP
      -- Check if result is from correct tenant
      IF result_record.tenant_id != expected_tenant THEN
        mismatch_count := mismatch_count + 1;
        RAISE WARNING '🚨 TENANT LEAK: Got document from tenant % (expected %)', 
          result_record.tenant_id, expected_tenant;
      END IF;
      
      RAISE NOTICE '📄 Result: % (tenant: %, similarity: %)',
        result_record.filename,
        result_record.tenant_id::text,
        ROUND(result_record.similarity::numeric, 3);
    END LOOP;
    
    IF mismatch_count = 0 THEN
      RAISE NOTICE '✅ All results from correct tenant';
    ELSE
      RAISE WARNING '🚨 Found % tenant mismatches!', mismatch_count;
    END IF;
  ELSE
    RAISE NOTICE '⚠️ No "avengers" content found for testing';
  END IF;
END $$;

-- ========================================
-- CHECK 5: Confidence Score Distribution
-- ========================================
SELECT '=== CONFIDENCE SCORE DISTRIBUTION ===' as test;

-- Test with random embeddings to see score distribution
WITH sample_test AS (
  SELECT embedding, d.tenant_id
  FROM document_chunks dc
  JOIN documents d ON d.id = dc.document_id
  WHERE embedding IS NOT NULL
  LIMIT 5
),
search_results AS (
  SELECT 
    st.tenant_id::text as query_tenant,
    ss.*
  FROM sample_test st,
  LATERAL similarity_search(st.embedding, 0.0, 100, NULL, 1) ss
)
SELECT 
  CASE 
    WHEN similarity >= 0.9 THEN '0.9-1.0 (Very High)'
    WHEN similarity >= 0.8 THEN '0.8-0.9 (High)'
    WHEN similarity >= 0.7 THEN '0.7-0.8 (Medium)'
    WHEN similarity >= 0.5 THEN '0.5-0.7 (Low)'
    ELSE '0.0-0.5 (Very Low)'
  END as similarity_range,
  COUNT(*) as count,
  ROUND(AVG(similarity)::numeric, 3) as avg_similarity
FROM search_results
GROUP BY 1
ORDER BY 1 DESC;

-- ========================================
-- CHECK 6: Document Metadata Quality
-- ========================================
SELECT '=== DOCUMENT METADATA QUALITY ===' as test;

SELECT 
  COUNT(*) as total_documents,
  COUNT(CASE WHEN filename IS NULL OR filename = '' THEN 1 END) as missing_filename,
  COUNT(CASE WHEN tenant_id IS NULL THEN 1 END) as missing_tenant_id,
  COUNT(CASE WHEN metadata = '{}'::jsonb THEN 1 END) as empty_metadata,
  CASE 
    WHEN COUNT(CASE WHEN filename IS NULL THEN 1 END) > 0 THEN '❌ Some documents missing filename'
    WHEN COUNT(CASE WHEN tenant_id IS NULL THEN 1 END) > 0 THEN '🚨 CRITICAL: Some documents missing tenant_id!'
    ELSE '✅ All documents have required fields'
  END as status
FROM documents;

-- ========================================
-- CHECK 7: Sample Documents Per Tenant
-- ========================================
SELECT '=== DOCUMENTS PER TENANT (SAMPLE) ===' as test;

SELECT 
  t.subdomain,
  d.filename,
  d.processing_status,
  COUNT(dc.id) as chunk_count,
  COUNT(dc.embedding) as embedded_chunks
FROM tenants t
JOIN documents d ON d.tenant_id = t.id
LEFT JOIN document_chunks dc ON dc.document_id = d.id
GROUP BY t.subdomain, d.id, d.filename, d.processing_status
ORDER BY t.subdomain, d.filename
LIMIT 20;

-- ========================================
-- SUMMARY RECOMMENDATIONS
-- ========================================
SELECT '=== RECOMMENDATIONS ===' as test;

DO $$
DECLARE
  total_tenants int;
  total_docs int;
  total_chunks int;
  embedded_chunks int;
  tenant_mismatches int;
BEGIN
  SELECT COUNT(*) INTO total_tenants FROM tenants;
  SELECT COUNT(*) INTO total_docs FROM documents;
  SELECT COUNT(*) INTO total_chunks FROM document_chunks;
  SELECT COUNT(*) INTO embedded_chunks FROM document_chunks WHERE embedding IS NOT NULL;
  
  SELECT COUNT(*) INTO tenant_mismatches
  FROM document_chunks dc
  JOIN documents d ON d.id = dc.document_id
  WHERE dc.tenant_id != d.tenant_id;
  
  RAISE NOTICE '📊 System Summary:';
  RAISE NOTICE '   - Tenants: %', total_tenants;
  RAISE NOTICE '   - Documents: %', total_docs;
  RAISE NOTICE '   - Chunks: % (% embedded)', total_chunks, embedded_chunks;
  RAISE NOTICE '';
  
  IF tenant_mismatches > 0 THEN
    RAISE NOTICE '🚨 CRITICAL ISSUE: % tenant mismatches found!', tenant_mismatches;
    RAISE NOTICE '   → Fix: Update document_chunks.tenant_id to match documents.tenant_id';
  END IF;
  
  IF embedded_chunks < total_chunks THEN
    RAISE NOTICE '⚠️ ISSUE: % chunks without embeddings', total_chunks - embedded_chunks;
    RAISE NOTICE '   → Fix: Reprocess documents to generate embeddings';
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE '📋 Next Steps:';
  RAISE NOTICE '   1. Run full RAGAS diagnostic: npx tsx scripts/diagnose-rag-with-ragas.ts';
  RAISE NOTICE '   2. Test in chat interface to verify filename display';
  RAISE NOTICE '   3. Monitor for cross-tenant leakage in production';
END $$;

