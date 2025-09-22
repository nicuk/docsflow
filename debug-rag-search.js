#!/usr/bin/env node

/**
 * 🔍 DEBUG RAG SEARCH ISSUE
 * Check why RAG pipeline can't find the completed document
 */

import { createClient } from '@supabase/supabase-js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
import dotenv from 'dotenv';
dotenv.config({ path: join(__dirname, '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const TENANT_ID = '96bbb531-dbb5-499f-bae9-416a43a87e68';

async function debugRAGSearch() {
  console.log('🔍 DEBUGGING RAG SEARCH PIPELINE');
  console.log('='.repeat(60));

  // Step 1: Check documents table
  console.log('📄 CHECKING DOCUMENTS TABLE...');
  const { data: documents, error: docError } = await supabase
    .from('documents')
    .select('*')
    .eq('tenant_id', TENANT_ID)
    .eq('processing_status', 'completed');

  if (docError) {
    console.error('❌ Documents query error:', docError);
    return;
  }

  console.log(`✅ Found ${documents.length} completed documents`);
  if (documents.length > 0) {
    const doc = documents[0];
    console.log(`   Document ID: ${doc.id}`);
    console.log(`   Filename: ${doc.filename}`);
    console.log(`   Status: ${doc.processing_status}`);
    console.log(`   Created: ${doc.created_at}`);
  }

  // Step 2: Check document_chunks table  
  console.log('\n🧩 CHECKING DOCUMENT_CHUNKS TABLE...');
  const { data: chunks, error: chunkError } = await supabase
    .from('document_chunks')
    .select('id, document_id, chunk_index, tenant_id, content')
    .eq('tenant_id', TENANT_ID);

  if (chunkError) {
    console.error('❌ Chunks query error:', chunkError);
    return;
  }

  console.log(`✅ Found ${chunks.length} chunks in total`);
  if (chunks.length > 0) {
    console.log(`   First chunk ID: ${chunks[0].id}`);
    console.log(`   Document ID: ${chunks[0].document_id}`);
    console.log(`   Chunk index: ${chunks[0].chunk_index}`);
    console.log(`   Content preview: ${chunks[0].content.substring(0, 100)}...`);
  }

  // Step 3: Check if document ID matches chunk document_id
  if (documents.length > 0 && chunks.length > 0) {
    const docId = documents[0].id;
    const chunkDocId = chunks[0].document_id;
    const idsMatch = docId === chunkDocId;
    
    console.log(`\n🔗 DOCUMENT-CHUNK RELATIONSHIP:`);
    console.log(`   Document ID: ${docId}`);
    console.log(`   Chunk Doc ID: ${chunkDocId}`);
    console.log(`   IDs Match: ${idsMatch ? '✅ YES' : '❌ NO'}`);
    
    if (!idsMatch) {
      console.log('🚨 ORPHANED CHUNKS! Chunks reference different document ID');
    }
  }

  // Step 4: Test RAG search queries
  console.log('\n🎯 TESTING RAG SEARCH QUERIES...');
  
  const searchTerms = ['ledger', 'ethereum', 'stakingCurrenciesEnabled', 'solana'];
  
  for (const term of searchTerms) {
    const { data: searchResults, error: searchError } = await supabase
      .from('document_chunks')
      .select('id, document_id, content')
      .eq('tenant_id', TENANT_ID)
      .ilike('content', `%${term}%`)
      .limit(1);

    if (searchError) {
      console.error(`❌ Search error for "${term}":`, searchError);
      continue;
    }

    console.log(`   "${term}": ${searchResults.length} results`);
    if (searchResults.length > 0) {
      console.log(`     → Found in chunk ${searchResults[0].id}`);
    }
  }

  // Step 5: Summary
  console.log('\n📊 DIAGNOSIS SUMMARY:');
  console.log('='.repeat(40));
  
  if (documents.length === 0) {
    console.log('🚨 ISSUE: No completed documents found');
  } else if (chunks.length === 0) {
    console.log('🚨 ISSUE: Document exists but no chunks created');
  } else if (documents[0].id !== chunks[0].document_id) {
    console.log('🚨 ISSUE: Orphaned chunks - document/chunk ID mismatch');
  } else {
    console.log('✅ Documents and chunks exist and are linked correctly');
    console.log('🚨 ISSUE: RAG pipeline search logic may be flawed');
  }
}

debugRAGSearch().catch(console.error);
