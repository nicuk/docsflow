#!/usr/bin/env node

/**
 * DIRECT AUTH HEADER TEST: Test Chat API with manual JWT token
 * This bypasses frontend issues and tests our backend fixes directly
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const API_BASE = 'https://api.docsflow.app';
const TEST_TENANT_ID = '122928f6-f34e-484b-9a69-7e1f25caf45c';

console.log('🎯 Testing Chat API with direct JWT token...');
console.log('📍 This will bypass frontend and test our RAG fixes directly');

async function getValidJWT() {
  console.log('\n=== GETTING FRESH JWT TOKEN ===');
  
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );
    
    // Login with test credentials to get fresh JWT
    const { data, error } = await supabase.auth.signInWithPassword({
      email: 'support@bitto.tech',
      password: 'Testing123'
    });
    
    if (error) {
      console.error('❌ Login failed:', error.message);
      return null;
    }
    
    console.log('✅ Login successful');
    console.log('📊 JWT token length:', data.session?.access_token?.length || 0);
    console.log('📊 Token preview:', data.session?.access_token?.substring(0, 50) + '...');
    
    return data.session?.access_token;
  } catch (err) {
    console.error('❌ Auth error:', err.message);
    return null;
  }
}

async function testChatAPIWithToken(jwt) {
  console.log('\n=== TESTING CHAT API WITH VALID JWT ===');
  
  try {
    const response = await fetch(`${API_BASE}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${jwt}`, // 🎯 EXPLICIT AUTHORIZATION HEADER
        'X-Tenant-ID': TEST_TENANT_ID,
        'X-Tenant-Subdomain': 'bitto',
        'Origin': 'https://bitto.docsflow.app'
      },
      body: JSON.stringify({
        message: 'What documents do we have?',
        conversationId: 'test-' + Date.now()
      })
    });
    
    console.log('📊 Response Status:', response.status);
    console.log('📊 Response Headers:');
    for (const [key, value] of response.headers.entries()) {
      if (key.includes('tenant') || key.includes('vercel') || key.includes('cache')) {
        console.log(`   ${key}: ${value}`);
      }
    }
    
    const responseText = await response.text();
    console.log('📊 Response Body Length:', responseText.length);
    
    try {
      const data = JSON.parse(responseText);
      console.log('📊 Parsed Response:', {
        answer: data.answer?.substring(0, 100) + '...',
        sourcesCount: data.sources?.length || 0,
        confidence: data.confidence,
        confidence_level: data.confidence_level,
        abstained: data.metadata?.abstained
      });
      
      if (data.sources && data.sources.length > 0) {
        console.log('✅ SUCCESS: RAG found sources!');
        data.sources.slice(0, 3).forEach((source, idx) => {
          console.log(`   ${idx + 1}. ${source.filename || source.document || 'Unknown'}`);
        });
      } else {
        console.log('❌ ISSUE: No sources found despite valid auth');
      }
      
      return response.status === 200 && !data.metadata?.abstained;
    } catch (parseError) {
      console.log('❌ Response is not JSON:', responseText.substring(0, 200));
      return false;
    }
    
  } catch (error) {
    console.error('❌ Request failed:', error.message);
    return false;
  }
}

async function testDocumentsAPIForComparison(jwt) {
  console.log('\n=== TESTING DOCUMENTS API (for comparison) ===');
  
  try {
    const response = await fetch(`${API_BASE}/api/documents`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${jwt}`,
        'X-Tenant-ID': TEST_TENANT_ID,
        'X-Tenant-Subdomain': 'bitto',
        'Origin': 'https://bitto.docsflow.app'
      }
    });
    
    console.log('📊 Documents API Status:', response.status);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Documents API working:', data?.documents?.length || 0, 'documents');
      return true;
    } else {
      const errorText = await response.text();
      console.log('❌ Documents API failed:', errorText);
      return false;
    }
    
  } catch (error) {
    console.error('❌ Documents API error:', error.message);
    return false;
  }
}

async function main() {
  console.log('🔍 DIRECT API TESTING - Bypassing Frontend Issues');
  
  const jwt = await getValidJWT();
  if (!jwt) {
    console.log('❌ Cannot proceed without valid JWT token');
    return;
  }
  
  const documentsWork = await testDocumentsAPIForComparison(jwt);
  const chatWorks = await testChatAPIWithToken(jwt);
  
  console.log('\n=== DIAGNOSIS ===');
  console.log(`📄 Documents API: ${documentsWork ? '✅ WORKING' : '❌ FAILED'}`);
  console.log(`🤖 Chat API: ${chatWorks ? '✅ WORKING' : '❌ FAILED'}`);
  
  if (documentsWork && chatWorks) {
    console.log('\n🎯 RESULT: Both APIs working - frontend auth issue!');
    console.log('💡 SOLUTION: Fix frontend getAccessToken() or session management');
  } else if (documentsWork && !chatWorks) {
    console.log('\n🎯 RESULT: Documents work but Chat fails - RAG pipeline issue!');
    console.log('💡 SOLUTION: Check our RAG tenant filtering logs');
  } else {
    console.log('\n🎯 RESULT: Backend authentication still broken');
    console.log('💡 SOLUTION: Check JWT token validity and RLS policies');
  }
  
  console.log('\n📋 NEXT STEPS:');
  console.log('1. If both work → Frontend issue (fix getAccessToken)');
  console.log('2. If Documents work + Chat fails → RAG issue (check logs)');
  console.log('3. If both fail → Backend auth issue (check JWT)');
}

main().catch(console.error);
