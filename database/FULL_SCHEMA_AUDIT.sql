-- COMPREHENSIVE SCHEMA AUDIT
-- Run this to get EVERYTHING we need to verify code against production

-- ========================================
-- 1. DOCUMENTS TABLE - Complete Schema
-- ========================================
SELECT 
  'DOCUMENTS TABLE' as audit_section,
  column_name,
  data_type,
  character_maximum_length,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'documents' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- ========================================
-- 2. DOCUMENT_CHUNKS TABLE - Complete Schema  
-- ========================================
SELECT 
  'DOCUMENT_CHUNKS TABLE' as audit_section,
  column_name,
  data_type,
  character_maximum_length,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'document_chunks' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- ========================================
-- 3. INGESTION_JOBS TABLE - Complete Schema
-- ========================================
SELECT 
  'INGESTION_JOBS TABLE' as audit_section,
  column_name,
  data_type,
  character_maximum_length,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'ingestion_jobs' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- ========================================
-- 4. CHECK CONSTRAINTS
-- ========================================
SELECT 
  'TABLE CONSTRAINTS' as audit_section,
  table_name,
  constraint_name,
  constraint_type
FROM information_schema.table_constraints
WHERE table_name IN ('documents', 'document_chunks', 'ingestion_jobs')
  AND table_schema = 'public'
ORDER BY table_name, constraint_type;

-- ========================================
-- 5. CHECK COLUMN CONSTRAINTS (CHECK constraints details)
-- ========================================
SELECT 
  'CHECK CONSTRAINTS DETAILS' as audit_section,
  tc.table_name,
  tc.constraint_name,
  cc.check_clause
FROM information_schema.table_constraints tc
JOIN information_schema.check_constraints cc 
  ON tc.constraint_name = cc.constraint_name
WHERE tc.table_name IN ('documents', 'document_chunks', 'ingestion_jobs')
  AND tc.table_schema = 'public'
  AND tc.constraint_type = 'CHECK'
ORDER BY tc.table_name;

