#!/usr/bin/env node

/**
 * 🎯 COMPREHENSIVE CHAT FLOW SIMULATION
 * Simulates the exact user flow: Login -> Upload -> Chat
 * Tests all APIs with real authentication and data
 */

import fetch from 'node-fetch';
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

// Test credentials and tenant info
const TEST_EMAIL = 'test@example.com';
const TEST_PASSWORD = 'Testing123?';
const TENANT_SUBDOMAIN = 'test-company';
const TENANT_ID = '96bbb531-dbb5-499f-bae9-416a43a87e68';
const BASE_URL = `https://${TENANT_SUBDOMAIN}.docsflow.app`;

let authToken = null;
let conversationId = null;

// Helper function to make authenticated requests
async function makeRequest(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    'X-Tenant-ID': TENANT_ID,
    'X-Tenant-Subdomain': TENANT_SUBDOMAIN,
    ...options.headers
  };
  
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
    headers['X-Auth-Token'] = authToken;
  }
  
  const response = await fetch(url, {
    ...options,
    headers
  });
  
  return { response, data: await response.json() };
}

async function step1_Login() {
  console.log('🔐 STEP 1: LOGIN SIMULATION');
  console.log('='.repeat(50));
  
  try {
    const { response, data } = await makeRequest('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: TEST_EMAIL,
        password: TEST_PASSWORD
      })
    });
    
    console.log(`📡 Login Status: ${response.status} ${response.statusText}`);
    
    if (response.ok && data.session?.access_token) {
      authToken = data.session.access_token;
      console.log(`✅ Login successful! Token: ${authToken.substring(0, 30)}...`);
      return true;
    } else {
      console.error(`❌ Login failed:`, data);
      return false;
    }
  } catch (error) {
    console.error(`❌ Login error:`, error.message);
    return false;
  }
}

async function step2_CheckSession() {
  console.log('\n👤 STEP 2: SESSION VERIFICATION');
  console.log('='.repeat(50));
  
  try {
    const { response, data } = await makeRequest('/api/auth/session');
    
    console.log(`📡 Session Status: ${response.status} ${response.statusText}`);
    
    if (response.ok && data.authenticated) {
      console.log(`✅ Session verified! User: ${data.user?.email}`);
      console.log(`   User ID: ${data.user?.id}`);
      console.log(`   Tenant: ${data.tenantInfo?.name}`);
      return true;
    } else {
      console.error(`❌ Session verification failed:`, data);
      return false;
    }
  } catch (error) {
    console.error(`❌ Session error:`, error.message);
    return false;
  }
}

async function step3_CheckDocuments() {
  console.log('\n📄 STEP 3: DOCUMENTS VERIFICATION');
  console.log('='.repeat(50));
  
  try {
    const { response, data } = await makeRequest('/api/documents');
    
    console.log(`📡 Documents Status: ${response.status} ${response.statusText}`);
    
    if (response.ok) {
      console.log(`✅ Documents API working! Found ${data.documents?.length || 0} documents`);
      
      if (data.documents && data.documents.length > 0) {
        const doc = data.documents[0];
        console.log(`   Document: ${doc.filename}`);
        console.log(`   Status: ${doc.processing_status}`);
        console.log(`   ID: ${doc.id}`);
        return true;
      } else {
        console.log(`⚠️ No documents found - upload test file first`);
        return false;
      }
    } else {
      console.error(`❌ Documents API failed:`, data);
      return false;
    }
  } catch (error) {
    console.error(`❌ Documents error:`, error.message);
    return false;
  }
}

async function step4_TestChat() {
  console.log('\n💬 STEP 4: CHAT API SIMULATION');
  console.log('='.repeat(50));
  
  const testQueries = [
    'What documents do you have?',
    'Tell me about the content',
    'What information is available?',
    'Help me understand the ledger data'
  ];
  
  for (const query of testQueries) {
    console.log(`\n🔍 Testing query: "${query}"`);
    console.log('-'.repeat(40));
    
    try {
      const { response, data } = await makeRequest('/api/chat', {
        method: 'POST',
        body: JSON.stringify({
          message: query,
          conversationId: conversationId
        })
      });
      
      console.log(`📡 Chat Status: ${response.status} ${response.statusText}`);
      
      if (response.ok) {
        console.log(`✅ Chat Response: ${data.response?.substring(0, 100)}...`);
        console.log(`   Sources: ${data.sources?.length || 0}`);
        console.log(`   Confidence: ${data.confidence}`);
        console.log(`   Confidence Level: ${data.confidence_level}`);
        
        // Save conversation ID for future queries
        if (data.conversationId && !conversationId) {
          conversationId = data.conversationId;
          console.log(`   Conversation ID: ${conversationId}`);
        }
        
        // Check if this is a successful response with actual content
        if (data.response && !data.response.includes('No documents found')) {
          console.log(`🎉 SUCCESS: Chat found and used document content!`);
          return true;
        } else {
          console.log(`⚠️ Chat abstained or found no documents`);
        }
      } else {
        console.error(`❌ Chat failed:`, data);
      }
    } catch (error) {
      console.error(`❌ Chat error:`, error.message);
    }
    
    // Wait 2 seconds between queries
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  return false;
}

async function step5_DatabaseInspection() {
  console.log('\n🔍 STEP 5: DATABASE INSPECTION');
  console.log('='.repeat(50));
  
  try {
    // Check documents
    const { data: documents, error: docError } = await supabase
      .from('documents')
      .select('*')
      .eq('tenant_id', TENANT_ID)
      .eq('processing_status', 'completed');
    
    console.log(`📄 Completed Documents: ${documents?.length || 0}`);
    if (documents && documents.length > 0) {
      console.log(`   Latest: ${documents[0].filename} (${documents[0].id})`);
    }
    
    // Check chunks
    const { data: chunks, error: chunkError } = await supabase
      .from('document_chunks')
      .select('id, document_id, content')
      .eq('tenant_id', TENANT_ID)
      .limit(3);
    
    console.log(`📦 Document Chunks: ${chunks?.length || 0}`);
    if (chunks && chunks.length > 0) {
      console.log(`   Sample chunk: ${chunks[0].content.substring(0, 100)}...`);
    }
    
    // Test RAG search directly
    const { data: searchResults, error: searchError } = await supabase
      .from('document_chunks')
      .select('id, content')
      .eq('tenant_id', TENANT_ID)
      .ilike('content', '%document%')
      .limit(1);
    
    console.log(`🔍 RAG Search Test: ${searchResults?.length || 0} results`);
    
    return {
      documents: documents?.length || 0,
      chunks: chunks?.length || 0,
      searchable: searchResults?.length || 0
    };
    
  } catch (error) {
    console.error(`❌ Database inspection error:`, error.message);
    return { documents: 0, chunks: 0, searchable: 0 };
  }
}

async function runFullSimulation() {
  console.log('🚀 FULL CHAT FLOW SIMULATION');
  console.log('='.repeat(60));
  console.log(`🎯 Target: ${BASE_URL}`);
  console.log(`👤 User: ${TEST_EMAIL}`);
  console.log(`🏢 Tenant: ${TENANT_SUBDOMAIN} (${TENANT_ID})`);
  console.log('='.repeat(60));
  
  // Step 1: Login
  const loginSuccess = await step1_Login();
  if (!loginSuccess) {
    console.log('\n🚨 SIMULATION FAILED: Login unsuccessful');
    return;
  }
  
  // Step 2: Verify session
  const sessionSuccess = await step2_CheckSession();
  if (!sessionSuccess) {
    console.log('\n🚨 SIMULATION FAILED: Session verification failed');
    return;
  }
  
  // Step 3: Check documents
  const documentsExist = await step3_CheckDocuments();
  
  // Step 4: Test chat
  const chatSuccess = await step4_TestChat();
  
  // Step 5: Database inspection
  const dbStats = await step5_DatabaseInspection();
  
  // Final Analysis
  console.log('\n📊 SIMULATION RESULTS');
  console.log('='.repeat(60));
  console.log(`🔐 Login: ${loginSuccess ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`👤 Session: ${sessionSuccess ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`📄 Documents: ${documentsExist ? '✅ PASS' : '⚠️ NO DOCS'}`);
  console.log(`💬 Chat: ${chatSuccess ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`🗄️ Database: ${dbStats.documents} docs, ${dbStats.chunks} chunks, ${dbStats.searchable} searchable`);
  
  if (loginSuccess && sessionSuccess && documentsExist && !chatSuccess) {
    console.log('\n🎯 DIAGNOSIS: Authentication and documents work, but chat RAG pipeline fails');
    console.log('   → RAG search logic needs debugging');
    console.log('   → Check logs for RAG abstention reasons');
  } else if (chatSuccess) {
    console.log('\n🎉 SUCCESS: Full chat flow working end-to-end!');
  } else {
    console.log('\n🚨 MULTIPLE ISSUES: Check authentication and document processing');
  }
}

runFullSimulation().catch(console.error);
