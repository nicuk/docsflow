#!/usr/bin/env node

/**
 * CHAT API LOG INVESTIGATION: Check if our fix deployed
 */

import fetch from 'node-fetch';

const API_URL = 'https://api.docsflow.app';
const BASE_URL = 'https://bitto.docsflow.app';

// Fresh token from logs
const FRESH_TOKEN = 'eyJhbGciOiJIUzI1NiIsImtpZCI6IndJVnZLekpxUThYamVhOVEiLCJ0eXAiOiJKV1QifQ.eyJpc3MiOiJodHRwczovL2xoY29wd3dpcXdqcHpiZG5qb3ZvLnN1cGFiYXNlLmNvL2F1dGgvdjEiLCJzdWIiOiJjYzM2MmFlYi1iZjk3LTQyNjAtOWRmYi1iYjE3MjVjOWMyMDIiLCJhdWQiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjoxNzU4NTMxNDQxLCJpYXQiOjE3NTg1Mjc4NDEsImVtYWlsIjoic3VwcG9ydEBiaXR0by50ZWNoIiwicGhvbmUiOiIiLCJhcHBfbWV0YWRhdGEiOnsicHJvdmlkZXIiOiJlbWFpbCIsInByb3ZpZGVycyI6WyJlbWFpbCJdfSwidXNlcl9tZXRhZGF0YSI6eyJhY2Nlc3NfbGV2ZWwiOjIsImNvbXBhbnlfbmFtZSI6ImJpdHRvIiwiZW1haWwiOiJzdXBwb3J0QGJpdHRvLnRlY2giLCJlbWFpbF92ZXJpZmllZCI6dHJ1ZSwicGhvbmVfdmVyaWZpZWQiOmZhbHNlLCJyb2xlIjoidXNlciIsInN1YiI6ImNjMzYyYWViLWJmOTctNDI2MC05ZGZiLWJiMTcyNWM5YzIwMiJ9LCJyb2xlIjoiYXV0aGVudGljYXRlZCIsImFhbCI6ImFhbDEiLCJhbXIiOlt7Im1ldGhvZCI6InBhc3N3b3JkIiwidGltZXN0YW1wIjoxNzU4NTI3ODQxfV0sInNlc3Npb25faWQiOiI4NmJlYjE3OC03NTU3LTQ2YzUtYTBhNy02M2VmMmU2NDIxNTEiLCJpc19hbm9ueW1vdXMiOmZhbHNlfQ.MsCsDSDx36YhKwqK5-5jxu5AyRpePVjwgerDFvuVfk8';

async function testChatAPI() {
  console.log('🔍 TESTING CHAT API DIRECTLY');
  console.log('============================');

  try {
    const response = await fetch(`${API_URL}/api/chat`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${FRESH_TOKEN}`,
        'Content-Type': 'application/json',
        'Origin': BASE_URL,
        'X-Auth-Token': FRESH_TOKEN,
        'X-Tenant-ID': '122928f6-f34e-484b-9a69-7e1f25caf45c',
        'X-Tenant-Subdomain': 'bitto'
      },
      body: JSON.stringify({
        message: 'saft',
        conversationId: 'test-debug-conversation'
      })
    });

    console.log('📋 Response Status:', response.status);
    console.log('📋 Response Headers:', Object.fromEntries(response.headers.entries()));

    const data = await response.json();
    
    console.log('📋 Chat API Response:', {
      success: response.ok,
      hasAnswer: !!data.answer,
      answerPreview: data.answer?.substring(0, 100) + '...' || 'none',
      sourcesCount: data.sources?.length || 0,
      confidence: data.confidence,
      strategy: data.metadata?.strategy,
      error: data.error
    });

    if (data.sources && data.sources.length > 0) {
      console.log('✅ Chat API found document sources');
      console.log('📄 Sample sources:', data.sources.slice(0, 2).map(s => s.source || s.filename));
    } else {
      console.log('❌ Chat API found no document sources');
      console.log('🔍 This confirms RAG pipeline issue');
    }

  } catch (error) {
    console.log('💥 Chat API Exception:', error.message);
  }
}

console.log('🚀 Starting Direct Chat API Test...\n');

testChatAPI()
  .then(() => {
    console.log('\n🏁 DIRECT TEST COMPLETE');
    console.log('========================');
    console.log('');
    console.log('🎯 EXPECTED BEHAVIOR:');
    console.log('- If our fix deployed: Should see auth context logs');
    console.log('- If fix working: Should find documents with "saft"');
    console.log('- If still broken: No documents found despite 27 existing');
  })
  .catch(error => {
    console.error('💥 TEST FAILED:', error);
  });
