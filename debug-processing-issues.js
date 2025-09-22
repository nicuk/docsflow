#!/usr/bin/env node

/**
 * 🔍 DEBUG PROCESSING & CHAT ISSUES
 * Test why documents stay in "Processing" and chat can't find them
 */

import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';
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

const TENANT_ID = '96bbb531-dbb5-499f-bae9-416a43a87e68'; // test-company
const TEST_TOKEN = 'eyJhbGciOiJIUzI1NiIsImtpZCI6IndJVnZLekpxUThYamVhOVEiLCJ0eXAiOiJKV1QifQ.eyJpc3MiOiJodHRwczovL2xoY29wd3dpcXdqcHpiZG5qb3ZvLnN1cGFiYXNlLmNvL2F1dGgvdjEiLCJzdWIiOiI4NWY5NjIzYi05Nzc1LTQzNzUtYmQ3OS0yZTNlMmJlZmNmODkiLCJhdWQiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjoxNzU4NTYxNjMxLCJpYXQiOjE3NTg1NTgwMzEsImVtYWlsIjoidGVzdEBleGFtcGxlLmNvbSIsInBob25lIjoiIiwiYXBwX21ldGFkYXRhIjp7InByb3ZpZGVyIjoiZW1haWwiLCJwcm92aWRlcnMiOlsiZW1haWwiXX0sInVzZXJfbWV0YWRhdGEiOnsiZW1haWxfdmVyaWZpZWQiOnRydWUsIm5hbWUiOiJUZXN0IFVzZXIiLCJyb2xlIjoiYWRtaW4ifSwicm9sZSI6ImF1dGhlbnRpY2F0ZWQiLCJhYWwiOiJhYWwxIiwiYW1yIjpbeyJtZXRob2QiOiJwYXNzd29yZCIsInRpbWVzdGFtcCI6MTc1ODU1ODAzMX1dLCJzZXNzaW9uX2lkIjoiNmY1YThhNmMtMzY5NC00YjY3LWEyYTMtYTA2NDgwNTE2Y2YzIiwiaXNfYW5vbnltb3VzIjpmYWxzZX0.Yp-77G_knX0HTiZjkJio_BUNKRJRBvotJn26SNZdbZc';

async function checkDocumentStatus() {
  console.log('🔍 CHECKING DOCUMENT STATUS...');
  console.log('='.repeat(50));

  // Check documents table
  const { data: documents, error: docError } = await supabase
    .from('documents')
    .select('id, filename, processing_status, processing_progress, created_at')
    .eq('tenant_id', TENANT_ID)
    .order('created_at', { ascending: false })
    .limit(5);

  if (docError) {
    console.error('❌ Documents query error:', docError);
    return;
  }

  console.log(`📄 Found ${documents.length} documents:`);
  for (const doc of documents) {
    console.log(`   ${doc.filename}:`);
    console.log(`     Status: ${doc.processing_status}`);
    console.log(`     Progress: ${doc.processing_progress}%`);
    console.log(`     ID: ${doc.id}`);
    console.log(`     Created: ${doc.created_at}`);
  }

  return documents;
}

async function checkDocumentChunks(documentId) {
  console.log(`\n🧩 CHECKING CHUNKS FOR DOCUMENT: ${documentId}...`);
  
  const { data: chunks, error: chunkError } = await supabase
    .from('document_chunks')
    .select('id, chunk_index, tenant_id')
    .eq('document_id', documentId)
    .eq('tenant_id', TENANT_ID);

  if (chunkError) {
    console.error('❌ Chunks query error:', chunkError);
    return 0;
  }

  console.log(`📦 Found ${chunks.length} chunks for document ${documentId}`);
  if (chunks.length > 0) {
    console.log(`   First chunk ID: ${chunks[0].id}`);
    console.log(`   Tenant ID match: ${chunks[0].tenant_id === TENANT_ID}`);
  }

  return chunks.length;
}

async function testChatAPI() {
  console.log('\n💬 TESTING CHAT API...');
  console.log('='.repeat(50));

  try {
    const response = await fetch('https://test-company.docsflow.app/api/chat', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TEST_TOKEN}`,
        'Content-Type': 'application/json',
        'X-Tenant-ID': TENANT_ID,
        'X-Tenant-Subdomain': 'test-company'
      },
      body: JSON.stringify({
        message: 'What documents do you have access to?',
        conversationId: null
      })
    });

    console.log(`📡 Chat API Response: ${response.status} ${response.statusText}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Chat API Error: ${errorText}`);
      return;
    }

    const chatData = await response.json();
    console.log(`💭 Chat Response: ${chatData.response?.substring(0, 200)}...`);
    
    return chatData;
  } catch (error) {
    console.error('❌ Chat API Network Error:', error.message);
  }
}

async function testRAGSearch() {
  console.log('\n🔍 TESTING RAG SEARCH DIRECTLY...');
  console.log('='.repeat(50));

  // Test if RAG can find documents
  const { data: ragChunks, error: ragError } = await supabase
    .from('document_chunks')
    .select('id, document_id, content, tenant_id')
    .eq('tenant_id', TENANT_ID)
    .ilike('content', '%ledger%')
    .limit(3);

  if (ragError) {
    console.error('❌ RAG search error:', ragError);
    return;
  }

  console.log(`🎯 RAG Search Results: ${ragChunks.length} chunks found`);
  for (const chunk of ragChunks) {
    console.log(`   Chunk ${chunk.id}: ${chunk.content.substring(0, 100)}...`);
    console.log(`   Document ID: ${chunk.document_id}`);
    console.log(`   Tenant ID: ${chunk.tenant_id}`);
  }

  return ragChunks.length;
}

async function diagnoseIssues() {
  console.log('🚨 PROCESSING & CHAT ISSUES DIAGNOSTIC');
  console.log('='.repeat(60));

  // Step 1: Check document status
  const documents = await checkDocumentStatus();
  
  if (!documents || documents.length === 0) {
    console.log('\n❌ NO DOCUMENTS FOUND - Upload may have failed');
    return;
  }

  // Step 2: Check chunks for processing documents
  let totalChunks = 0;
  const processingDocs = documents.filter(d => d.processing_status === 'processing');
  
  for (const doc of processingDocs) {
    const chunkCount = await checkDocumentChunks(doc.id);
    totalChunks += chunkCount;
  }

  // Step 3: Test RAG search
  const ragResults = await testRAGSearch();

  // Step 4: Test Chat API
  const chatResponse = await testChatAPI();

  // Step 5: Analysis
  console.log('\n📊 DIAGNOSTIC SUMMARY:');
  console.log('='.repeat(60));
  
  console.log(`📄 Total documents: ${documents.length}`);
  console.log(`⏳ Processing documents: ${processingDocs.length}`);
  console.log(`📦 Total chunks: ${totalChunks}`);
  console.log(`🔍 RAG search results: ${ragResults}`);
  console.log(`💬 Chat API working: ${chatResponse ? 'YES' : 'NO'}`);

  // Issue identification
  console.log('\n🎯 ISSUE IDENTIFICATION:');
  
  if (processingDocs.length > 0 && totalChunks > 0) {
    console.log('🚨 ISSUE #2: Documents have chunks but status not updated to "ready"');
    console.log('   → Need to update processing_status in documents table');
  }
  
  if (ragResults === 0) {
    console.log('🚨 ISSUE #3a: RAG search finds no chunks (chunking failed)');
  } else if (!chatResponse) {
    console.log('🚨 ISSUE #3b: RAG finds chunks but Chat API failed');
  } else {
    console.log('✅ Chat API working - issue may be frontend related');
  }
}

diagnoseIssues().catch(console.error);
