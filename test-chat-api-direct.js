#!/usr/bin/env node

/**
 * DIRECT CHAT API TEST: Test if Chat API can find documents
 * 
 * This will test the exact same request the frontend makes
 */

import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const API_BASE = 'https://api.docsflow.app';
const TEST_TENANT_ID = '122928f6-f34e-484b-9a69-7e1f25caf45c';

// We need a real JWT token from the session logs
// From the logs: eyJhbGciOiJIUzI1NiIsImtpZCI6IndJVnZLekpxUThYamVhOVEiLCJ0eXAiOiJKV1QifQ...
const TEST_JWT = 'eyJhbGciOiJIUzI1NiIsImtpZCI6IndJVnZLekpxUThYamVhOVEiLCJ0eXAiOiJKV1QifQ.eyJpc3MiOiJodHRwczovL2xoY29wd3dpcXdqcHpiZG5qb3ZvLnN1cGFiYXNlLmNvL2F1dGgvdjEiLCJzdWIiOiJjYzM2MmFlYi1iZjk3LTQyNjAtOWRmYi1iYjE3MjVjOWMyMDIiLCJhdWQiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjoxNzU4NTMxNDQxLCJpYXQiOjE3NTg1Mjc4NDEsImVtYWlsIjoic3VwcG9ydEBiaXR0by50ZWNoIiwicGhvbmUiOiIiLCJhcHBfbWV0YWRhdGEiOnsicHJvdmlkZXIiOiJlbWFpbCIsInByb3ZpZGVycyI6WyJlbWFpbCJdfSwidXNlcl9tZXRhZGF0YSI6eyJhY2Nlc3NfbGV2ZWwiOjIsImNvbXBhbnlfbmFtZSI6ImJpdHRvIiwiZW1haWwiOiJzdXBwb3J0QGJpdHRvLnRlY2giLCJlbWFpbF92ZXJpZmllZCI6dHJ1ZSwicGhvbmVfdmVyaWZpZWQiOmZhbHNlLCJyb2xlIjoidXNlciIsInN1YiI6ImNjMzYyYWViLWJmOTctNDI2MC05ZGZiLWJiMTcyNWM5YzIwMiJ9LCJyb2xlIjoiYXV0aGVudGljYXRlZCIsImFhbCI6ImFhbDEiLCJhbXIiOlt7Im1ldGhvZCI6InBhc3N3b3JkIiwidGltZXN0YW1wIjoxNzU4NTI3ODQxfV0sInNlc3Npb25faWQiOiI4NmJlYjE3OC03NTU3LTQ2YzUtYTBhNy02M2VmMmU2NDIxNTEiLCJpc19hbm9ueW1vdXMiOmZhbHNlfQ.MsCsDSDx36YhKwqK5-5jxu5AyRpePVjwgerDFvuVfk8';

console.log('🎯 Testing Chat API directly...');
console.log('🏢 Target API:', API_BASE);
console.log('🏢 Tenant ID:', TEST_TENANT_ID);

async function testChatAPI() {
  console.log('\n=== CHAT API TEST ===');
  
  try {
    const response = await fetch(`${API_BASE}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${TEST_JWT}`,
        'X-Tenant-ID': TEST_TENANT_ID,
        'X-Tenant-Subdomain': 'bitto',
        'Origin': 'https://bitto.docsflow.app'
      },
      body: JSON.stringify({
        message: 'Do we have any documents?',
        conversationId: 'test-' + Date.now()
      })
    });
    
    console.log('📊 Response Status:', response.status);
    console.log('📊 Response Headers:');
    for (const [key, value] of response.headers.entries()) {
      console.log(`   ${key}: ${value}`);
    }
    
    const responseText = await response.text();
    console.log('📊 Response Body:', responseText);
    
    // Try to parse as JSON
    try {
      const data = JSON.parse(responseText);
      console.log('📊 Parsed JSON:', JSON.stringify(data, null, 2));
    } catch (e) {
      console.log('⚠️ Response is not JSON');
    }
    
  } catch (error) {
    console.error('❌ Chat API test failed:', error.message);
  }
}

async function testDocumentsAPI() {
  console.log('\n=== DOCUMENTS API TEST (for comparison) ===');
  
  try {
    const response = await fetch(`${API_BASE}/api/documents`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${TEST_JWT}`,
        'X-Tenant-ID': TEST_TENANT_ID,
        'X-Tenant-Subdomain': 'bitto',
        'Origin': 'https://bitto.docsflow.app'
      }
    });
    
    console.log('📊 Documents API Status:', response.status);
    
    if (response.ok) {
      const data = await response.json();
      console.log('📊 Documents found:', data?.documents?.length || 0);
      console.log('📊 Sample document:', data?.documents?.[0]?.filename || 'None');
    } else {
      const errorText = await response.text();
      console.log('❌ Documents API Error:', errorText);
    }
    
  } catch (error) {
    console.error('❌ Documents API test failed:', error.message);
  }
}

async function main() {
  await testDocumentsAPI();
  await testChatAPI();
  
  console.log('\n=== COMPARISON ===');
  console.log('If Documents API works but Chat API doesn\'t:');
  console.log('- ✅ Authentication is working');
  console.log('- ❌ Chat API has a specific issue (deployment/RAG pipeline)');
  
  console.log('\nIf both fail:');
  console.log('- ❌ JWT token might be expired');
  console.log('- ❌ Authentication context still broken');
}

main().catch(console.error);
