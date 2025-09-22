#!/usr/bin/env node

/**
 * DEBUG RAG PIPELINE: Test local RAG functionality vs production
 * 
 * This script will test:
 * 1. Direct database query for documents
 * 2. RAG pipeline vector search
 * 3. Document chunk retrieval
 * 4. Compare results to identify the gap
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Test credentials
const TEST_USER_EMAIL = 'support@bitto.tech';
const TEST_TENANT_ID = '122928f6-f34e-484b-9a69-7e1f25caf45c';
const TEST_QUERY = 'saft';

console.log('🔍 [RAG DEBUG] Starting RAG pipeline analysis...');
console.log('📊 Environment:', {
  supabaseUrl: supabaseUrl ? 'Set' : 'MISSING',
  serviceKey: supabaseServiceKey ? 'Set' : 'MISSING',
  anonKey: supabaseAnonKey ? 'Set' : 'MISSING'
});

async function testDirectDocumentQuery() {
  console.log('\n=== TEST 1: DIRECT DOCUMENT QUERY ===');
  
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  try {
    const { data: documents, error } = await supabase
      .from('documents')
      .select('id, filename, tenant_id, metadata')
      .eq('tenant_id', TEST_TENANT_ID)
      .limit(5);
    
    if (error) {
      console.error('❌ Document query failed:', error);
      return [];
    }
    
    console.log('✅ Documents found:', documents?.length || 0);
    documents?.forEach((doc, idx) => {
      console.log(`   ${idx + 1}. ${doc.filename} (${doc.id.substring(0, 8)}...)`);
      console.log(`      Metadata:`, doc.metadata);
    });
    
    return documents || [];
  } catch (err) {
    console.error('❌ Direct query error:', err.message);
    return [];
  }
}

async function testDocumentChunks() {
  console.log('\n=== TEST 2: DOCUMENT CHUNKS QUERY ===');
  
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  try {
    const { data: chunks, error } = await supabase
      .from('document_chunks')
      .select('id, document_id, content, tenant_id')
      .eq('tenant_id', TEST_TENANT_ID)
      .limit(10);
    
    if (error) {
      console.error('❌ Chunks query failed:', error);
      return [];
    }
    
    console.log('✅ Document chunks found:', chunks?.length || 0);
    
    // Show which documents have chunks
    const chunksByDoc = {};
    chunks?.forEach(chunk => {
      const docId = chunk.document_id;
      if (!chunksByDoc[docId]) chunksByDoc[docId] = [];
      chunksByDoc[docId].push(chunk);
    });
    
    console.log('📊 Chunks by document:');
    Object.entries(chunksByDoc).forEach(([docId, docChunks]) => {
      console.log(`   Doc ${docId.substring(0, 8)}...: ${docChunks.length} chunks`);
    });
    
    const saftChunks = chunks?.filter(chunk => 
      chunk.content?.toLowerCase().includes('saft')
    ) || [];
    
    console.log(`📊 Chunks containing "saft": ${saftChunks.length}`);
    
    saftChunks.forEach((chunk, idx) => {
      console.log(`   ${idx + 1}. Chunk ${chunk.id.substring(0, 8)}... from doc ${chunk.document_id.substring(0, 8)}...`);
      console.log(`      Content preview: "${chunk.content?.substring(0, 100)}..."`);
    });
    
    return chunks || [];
  } catch (err) {
    console.error('❌ Chunks query error:', err.message);
    return [];
  }
}

async function testRAGPipeline() {
  console.log('\n=== TEST 3: RAG PIPELINE SIMULATION ===');
  
  try {
    // Simulate the exact fetch call the frontend makes
    const response = await fetch('http://localhost:3000/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.TEST_AUTH_TOKEN || 'mock-token'}`,
        'X-Tenant-ID': TEST_TENANT_ID,
        'X-Tenant-Subdomain': 'bitto'
      },
      body: JSON.stringify({
        message: TEST_QUERY,
        conversationId: 'test-conversation'
      })
    });
    
    const data = await response.json();
    
    console.log('📊 RAG Response Status:', response.status);
    console.log('📊 RAG Response Data:', JSON.stringify(data, null, 2));
    
    return data;
  } catch (err) {
    console.error('❌ RAG pipeline test failed:', err.message);
    console.log('⚠️  This is expected if running against production API');
    return null;
  }
}

async function testUserDocumentLinking() {
  console.log('\n=== TEST 4: USER-DOCUMENT RELATIONSHIP ===');
  
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  try {
    // Get user ID from email
    const { data: users, error: userError } = await supabase
      .from('users')
      .select('id, email, tenant_id')
      .eq('email', TEST_USER_EMAIL)
      .eq('tenant_id', TEST_TENANT_ID);
    
    if (userError) {
      console.error('❌ User query failed:', userError);
      return;
    }
    
    console.log('✅ Users found:', users?.length || 0);
    users?.forEach(user => {
      console.log(`   User: ${user.email} (${user.id.substring(0, 8)}...)`);
    });
    
    if (users && users.length > 0) {
      const userId = users[0].id;
      
      // Check documents for this tenant (no user_id in schema)
      const { data: userDocs, error: docError } = await supabase
        .from('documents')
        .select('id, filename, tenant_id')
        .eq('tenant_id', TEST_TENANT_ID);
      
      if (docError) {
        console.error('❌ User documents query failed:', docError);
        return;
      }
      
      console.log(`📊 Total tenant documents: ${userDocs?.length || 0}`);
      
      userDocs?.forEach((doc, idx) => {
        console.log(`   ${idx + 1}. ${doc.filename} (${doc.id.substring(0, 8)}...)`);
      });
    }
  } catch (err) {
    console.error('❌ User-document test error:', err.message);
  }
}

async function main() {
  console.log(`🎯 Testing RAG pipeline for query: "${TEST_QUERY}"`);
  console.log(`🏢 Tenant: ${TEST_TENANT_ID}`);
  console.log(`👤 User: ${TEST_USER_EMAIL}`);
  
  const documents = await testDirectDocumentQuery();
  const chunks = await testDocumentChunks();
  await testUserDocumentLinking();
  await testRAGPipeline();
  
  console.log('\n=== ANALYSIS SUMMARY ===');
  console.log(`📄 Total documents: ${documents.length}`);
  console.log(`🧩 Total chunks: ${chunks.length}`);
  
  const documentsWithSaft = documents.filter(doc => 
    doc.content?.toLowerCase().includes('saft')
  );
  console.log(`🔍 Documents containing "saft": ${documentsWithSaft.length}`);
  
  if (documentsWithSaft.length > 0 && chunks.length === 0) {
    console.log('🚨 ISSUE IDENTIFIED: Documents exist but no chunks found!');
    console.log('💡 SOLUTION: Document chunking pipeline may be broken');
  } else if (documentsWithSaft.length > 0 && chunks.length > 0) {
    console.log('🚨 ISSUE IDENTIFIED: Data exists but RAG pipeline not finding it!');
    console.log('💡 SOLUTION: Vector search or authentication context issue');
  } else if (documentsWithSaft.length === 0) {
    console.log('🚨 ISSUE IDENTIFIED: No documents actually contain "saft"!');
    console.log('💡 SOLUTION: Test with different search terms');
  }
}

main().catch(console.error);
