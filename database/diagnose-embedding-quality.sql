-- Diagnose why unrelated documents get high similarity scores
-- This checks document content quality and embedding distribution

-- ========================================
-- CHECK 1: Document Content Length
-- ========================================
SELECT '=== DOCUMENT CONTENT LENGTH ANALYSIS ===' as check;

SELECT 
  d.filename,
  d.processing_status,
  COUNT(dc.id) as chunk_count,
  AVG(LENGTH(dc.content)) as avg_content_length,
  MIN(LENGTH(dc.content)) as min_content_length,
  MAX(LENGTH(dc.content)) as max_content_length,
  CASE 
    WHEN AVG(LENGTH(dc.content)) < 100 THEN '❌ VERY SHORT (poor embeddings expected)'
    WHEN AVG(LENGTH(dc.content)) < 300 THEN '⚠️ SHORT (may cause similarity issues)'
    WHEN AVG(LENGTH(dc.content)) < 1000 THEN '✅ GOOD'
    ELSE '✅ EXCELLENT'
  END as quality
FROM documents d
JOIN document_chunks dc ON dc.document_id = d.id
WHERE d.processing_status = 'completed'
GROUP BY d.id, d.filename, d.processing_status
ORDER BY avg_content_length ASC
LIMIT 20;

-- ========================================
-- CHECK 2: Content Sample from "Unknown" docs
-- ========================================
SELECT '=== SAMPLE CONTENT FROM DOCUMENTS ===' as check;

-- Show what's actually in these documents
SELECT 
  d.filename,
  d.mime_type,
  substring(dc.content, 1, 200) as content_preview,
  LENGTH(dc.content) as content_length,
  dc.metadata
FROM documents d
JOIN document_chunks dc ON dc.document_id = d.id
WHERE d.filename IN (
  'Worringerestrasse88_20250929.csv',
  'Test 1.xlsx',
  'Screenshot 2024-11-24 200013.png',
  'Screenshot 2024-11-24 202232.png',
  'Screenshot 2024-11-25 112254.png'
)
LIMIT 10;

-- ========================================
-- CHECK 3: Find the Avengers document
-- ========================================
SELECT '=== SEARCHING FOR AVENGERS CONTENT ===' as check;

SELECT 
  d.filename,
  d.id::text as document_id,
  dc.content,
  LENGTH(dc.content) as length
FROM documents d
JOIN document_chunks dc ON dc.document_id = d.id
WHERE dc.content ILIKE '%avengers%' 
   OR dc.content ILIKE '%marvel%'
   OR d.filename ILIKE '%avengers%'
   OR d.filename ILIKE '%marvel%'
LIMIT 5;

-- ========================================
-- CHECK 4: Embedding Vector Similarity Distribution
-- ========================================
SELECT '=== EMBEDDING SIMILARITY DISTRIBUTION ===' as check;

-- Check if embeddings are too similar (indicate poor quality)
WITH random_pairs AS (
  SELECT 
    dc1.id as id1,
    dc2.id as id2,
    d1.filename as file1,
    d2.filename as file2,
    1 - (dc1.embedding <=> dc2.embedding) as similarity
  FROM document_chunks dc1
  CROSS JOIN LATERAL (
    SELECT dc2.id, dc2.embedding, d2.filename
    FROM document_chunks dc2
    JOIN documents d2 ON d2.id = dc2.document_id
    WHERE dc2.id != dc1.id
      AND dc2.embedding IS NOT NULL
    ORDER BY RANDOM()
    LIMIT 1
  ) AS dc2_sample
  JOIN documents d1 ON d1.id = dc1.document_id
  JOIN documents d2 ON d2.id = dc2_sample.id
  WHERE dc1.embedding IS NOT NULL
  LIMIT 50
)
SELECT 
  CASE 
    WHEN similarity >= 0.9 THEN '0.9-1.0 (SUSPICIOUS - too similar!)'
    WHEN similarity >= 0.8 THEN '0.8-0.9 (Very High)'
    WHEN similarity >= 0.7 THEN '0.7-0.8 (High)'
    WHEN similarity >= 0.5 THEN '0.5-0.7 (Medium)'
    ELSE '0.0-0.5 (Low - Expected for random pairs)'
  END as similarity_range,
  COUNT(*) as count,
  ROUND(AVG(similarity)::numeric, 3) as avg_similarity,
  CASE 
    WHEN AVG(similarity) > 0.7 THEN '🚨 CRITICAL: Random docs are too similar! Embeddings are poor quality.'
    WHEN AVG(similarity) > 0.5 THEN '⚠️ WARNING: Higher than expected similarity for random pairs'
    ELSE '✅ OK: Low similarity as expected for random documents'
  END as diagnosis
FROM random_pairs
GROUP BY 1
ORDER BY 1 DESC;

-- ========================================
-- CHECK 5: Screenshot/Image Content Quality
-- ========================================
SELECT '=== IMAGE/SCREENSHOT CONTENT ANALYSIS ===' as check;

SELECT 
  d.filename,
  d.mime_type,
  COUNT(dc.id) as chunk_count,
  AVG(LENGTH(dc.content)) as avg_content_length,
  string_agg(DISTINCT substring(dc.content, 1, 50), ' | ') as content_samples
FROM documents d
JOIN document_chunks dc ON dc.document_id = d.id
WHERE d.filename ILIKE '%.png' 
   OR d.filename ILIKE '%.jpg'
   OR d.filename ILIKE '%.jpeg'
   OR d.mime_type LIKE 'image/%'
GROUP BY d.id, d.filename, d.mime_type
ORDER BY avg_content_length ASC
LIMIT 10;

-- ========================================
-- CHECK 6: Specific Query Test
-- ========================================
SELECT '=== TESTING "AVENGERS" QUERY ===' as check;

DO $$
DECLARE
  avengers_embedding vector(768);
  result_record RECORD;
  tenant_id_val uuid;
BEGIN
  -- Get embedding from avengers content if it exists
  SELECT dc.embedding, d.tenant_id INTO avengers_embedding, tenant_id_val
  FROM document_chunks dc
  JOIN documents d ON d.id = dc.document_id
  WHERE dc.content ILIKE '%avengers%'
  LIMIT 1;
  
  IF avengers_embedding IS NOT NULL THEN
    RAISE NOTICE '🔍 Testing with Avengers document embedding';
    RAISE NOTICE '   Tenant: %', tenant_id_val;
    RAISE NOTICE '---';
    
    -- Run similarity search
    FOR result_record IN 
      SELECT 
        filename,
        similarity,
        substring(content, 1, 100) as preview,
        LENGTH(content) as content_length
      FROM similarity_search(
        avengers_embedding,
        0.3,
        10,
        tenant_id_val::text,
        5
      )
      ORDER BY similarity DESC
    LOOP
      RAISE NOTICE 'Match: % (sim: %, len: %)',
        result_record.filename,
        ROUND(result_record.similarity::numeric, 3),
        result_record.content_length;
      RAISE NOTICE '  Preview: %', result_record.preview;
    END LOOP;
  ELSE
    RAISE NOTICE '⚠️ No Avengers content found - cannot test';
    RAISE NOTICE 'Showing top documents by name similarity instead:';
    
    FOR result_record IN
      SELECT filename, COUNT(*) as chunks
      FROM documents d
      JOIN document_chunks dc ON dc.document_id = d.id
      GROUP BY filename
      ORDER BY filename
      LIMIT 10
    LOOP
      RAISE NOTICE '  - % (% chunks)', result_record.filename, result_record.chunks;
    END LOOP;
  END IF;
END $$;

-- ========================================
-- SUMMARY & RECOMMENDATIONS
-- ========================================
SELECT '=== DIAGNOSTIC SUMMARY ===' as summary;

DO $$
DECLARE
  avg_chunk_length numeric;
  image_doc_count int;
  short_content_count int;
BEGIN
  SELECT AVG(LENGTH(content)) INTO avg_chunk_length
  FROM document_chunks;
  
  SELECT COUNT(DISTINCT document_id) INTO image_doc_count
  FROM documents
  WHERE mime_type LIKE 'image/%' OR filename LIKE '%.png' OR filename LIKE '%.jpg';
  
  SELECT COUNT(*) INTO short_content_count
  FROM document_chunks
  WHERE LENGTH(content) < 100;
  
  RAISE NOTICE '📊 System Statistics:';
  RAISE NOTICE '   - Avg chunk length: % chars', ROUND(avg_chunk_length);
  RAISE NOTICE '   - Image documents: %', image_doc_count;
  RAISE NOTICE '   - Chunks with <100 chars: %', short_content_count;
  RAISE NOTICE '';
  
  IF avg_chunk_length < 200 THEN
    RAISE WARNING '🚨 CRITICAL: Average chunk length is TOO SHORT (% chars)', ROUND(avg_chunk_length);
    RAISE NOTICE '   → Problem: Short content produces poor embeddings';
    RAISE NOTICE '   → Solution: Review document processing - may need better text extraction';
  END IF;
  
  IF image_doc_count > 10 THEN
    RAISE WARNING '⚠️ Many image documents detected (%)' , image_doc_count;
    RAISE NOTICE '   → Problem: OCR may not be extracting enough text';
    RAISE NOTICE '   → Solution: Check OCR quality and consider better image preprocessing';
  END IF;
  
  IF short_content_count > 50 THEN
    RAISE WARNING '⚠️ Many chunks with very short content (%)' , short_content_count;
    RAISE NOTICE '   → Problem: Generic embeddings lead to high false positives';
    RAISE NOTICE '   → Solution: Filter out chunks <100 chars or improve chunking strategy';
  END IF;
END $$;

