#!/usr/bin/env node

/**
 * 🔍 5-MINUTE DIAGNOSTIC: RAG Architecture Test
 * Tests if issue is deployment/cache vs architectural
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

const TENANT_ID = '96bbb531-dbb5-499f-bae9-416a43a87e68';
const BASE_URL = 'https://test-company.docsflow.app';
const AUTH_TOKEN = 'eyJhbGciOiJIUzI1NiIsImtpZCI6IndJVnZLekpxUThYamVhOVEiLCJ0eXAiOiJKV1QifQ.eyJpc3MiOiJodHRwczovL2xoY29wd3dpcXdqcHpiZG5qb3ZvLnN1cGFiYXNlLmNvL2F1dGgvdjEiLCJzdWIiOiI4NWY5NjIzYi05Nzc1LTQzNzUtYmQ3OS0yZTNlMmJlZmNmODkiLCJhdWQiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjoxNzU4NTYxNjMxLCJpYXQiOjE3NTg1NTgwMzEsImVtYWlsIjoidGVzdEBleGFtcGxlLmNvbSIsInBob25lIjoiIiwiYXBwX21ldGFkYXRhIjp7InByb3ZpZGVyIjoiZW1haWwiLCJwcm92aWRlcnMiOlsiZW1haWwiXX0sInVzZXJfbWV0YWRhdGEiOnsiZW1haWxfdmVyaWZpZWQiOnRydWUsIm5hbWUiOiJUZXN0IFVzZXIiLCJyb2xlIjoiYWRtaW4ifSwicm9sZSI6ImF1dGhlbnRpY2F0ZWQiLCJhYWwiOiJhYWwxIiwiYW1yIjpbeyJtZXRob2QiOiJwYXNzd29yZCIsInRpbWVzdGFtcCI6MTc1ODU1ODAzMX1dLCJzZXNzaW9uX2lkIjoiNmY1YThhNmMtMzY5NC00YjY3LWEyYTMtYTA2NDgwNTE2Y2YzIiwiaXNfYW5vbnltb3VzIjpmYWxzZX0.Yp-77G_knX0HTiZjkJio_BUNKRJRBvotJn26SNZdbZc';

async function diagnostic1_DirectChunkAccess() {
  console.log('🔍 DIAGNOSTIC 1: Direct Chunk Access (Bypass RAG)');
  console.log('='.repeat(50));
  
  try {
    // Test 1: Direct chunk retrieval
    const { data: chunks, error } = await supabase
      .from('document_chunks')
      .select('id, document_id, content, tenant_id')
      .eq('tenant_id', TENANT_ID)
      .limit(3);
    
    if (error) {
      console.error('❌ Database error:', error);
      return false;
    }
    
    console.log(`✅ Direct DB Access: ${chunks.length} chunks found`);
    if (chunks.length > 0) {
      console.log(`   Sample content: ${chunks[0].content.substring(0, 100)}...`);
      console.log(`   Document ID: ${chunks[0].document_id}`);
      console.log(`   Tenant match: ${chunks[0].tenant_id === TENANT_ID}`);
    }
    
    return chunks.length > 0;
  } catch (error) {
    console.error('❌ Direct chunk access failed:', error.message);
    return false;
  }
}

async function diagnostic2_CacheBustingTest() {
  console.log('\n🔄 DIAGNOSTIC 2: Cache-Busting Chat API Test');
  console.log('='.repeat(50));
  
  try {
    const timestamp = Date.now();
    const response = await fetch(`${BASE_URL}/api/chat?v=${timestamp}&debug=true`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${AUTH_TOKEN}`,
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
        'X-Tenant-ID': TENANT_ID,
        'X-Tenant-Subdomain': 'test-company'
      },
      body: JSON.stringify({
        message: 'What files do I have? Show me any content.',
        conversationId: null
      })
    });
    
    console.log(`📡 Cache-busted API Status: ${response.status} ${response.statusText}`);
    
    const data = await response.json();
    console.log(`🎯 Response: ${data.response?.substring(0, 150)}...`);
    console.log(`📊 Sources found: ${data.sources?.length || 0}`);
    console.log(`🎲 Confidence: ${data.confidence}`);
    console.log(`🔧 Strategy: ${data.metadata?.strategy || 'unknown'}`);
    
    // Check if we got actual content vs "no documents"
    const hasContent = data.sources && data.sources.length > 0;
    const notAbstained = !data.response?.includes('No documents found');
    
    return hasContent || notAbstained;
  } catch (error) {
    console.error('❌ Cache-busting test failed:', error.message);
    return false;
  }
}

async function diagnostic3_RAGStrategyTest() {
  console.log('\n🎯 DIAGNOSTIC 3: Multi-RAG Strategy Test');
  console.log('='.repeat(50));
  
  const testQueries = [
    { query: 'ethereum', expectMatch: true },   // Should find crypto content
    { query: 'ledger', expectMatch: true },     // Should find filename
    { query: 'solana', expectMatch: true },     // Should find crypto content
    { query: 'xyz123', expectMatch: false }     // Should not find anything
  ];
  
  let workingStrategies = 0;
  
  for (const test of testQueries) {
    try {
      const response = await fetch(`${BASE_URL}/api/chat`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${AUTH_TOKEN}`,
          'Content-Type': 'application/json',
          'X-Tenant-ID': TENANT_ID,
          'X-Tenant-Subdomain': 'test-company'
        },
        body: JSON.stringify({
          message: test.query,
          conversationId: null
        })
      });
      
      const data = await response.json();
      const foundSources = data.sources?.length > 0;
      const expectedResult = test.expectMatch ? 'SHOULD find' : 'should NOT find';
      const actualResult = foundSources ? 'FOUND' : 'not found';
      const status = (foundSources === test.expectMatch) ? '✅' : '❌';
      
      console.log(`   ${status} "${test.query}": ${expectedResult} → ${actualResult} (${data.sources?.length || 0} sources)`);
      
      if (foundSources === test.expectMatch) {
        workingStrategies++;
      }
      
    } catch (error) {
      console.log(`   ❌ "${test.query}": Error - ${error.message}`);
    }
    
    // Wait between requests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  const accuracy = (workingStrategies / testQueries.length) * 100;
  console.log(`📊 RAG Accuracy: ${workingStrategies}/${testQueries.length} (${accuracy.toFixed(1)}%)`);
  
  return accuracy > 50; // At least half the tests should work
}

async function runDiagnostics() {
  console.log('🔍 5-MINUTE RAG ARCHITECTURE DIAGNOSTIC');
  console.log('='.repeat(60));
  console.log('🎯 Goal: Determine if issue is deployment/cache vs architectural');
  console.log('='.repeat(60));
  
  const results = {
    directAccess: await diagnostic1_DirectChunkAccess(),
    cacheBusting: await diagnostic2_CacheBustingTest(),
    multiStrategy: await diagnostic3_RAGStrategyTest()
  };
  
  console.log('\n📊 DIAGNOSTIC RESULTS');
  console.log('='.repeat(60));
  console.log(`🗄️  Direct DB Access: ${results.directAccess ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`🔄 Cache-Busting API: ${results.cacheBusting ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`🎯 Multi-RAG Strategy: ${results.multiStrategy ? '✅ PASS' : '❌ FAIL'}`);
  
  // Analysis
  console.log('\n🎯 DIAGNOSIS:');
  
  if (results.directAccess && !results.cacheBusting && !results.multiStrategy) {
    console.log('🚨 ISSUE TYPE: DEPLOYMENT/CACHE PROBLEM');
    console.log('   → Data exists but RAG pipeline not finding it');
    console.log('   → Likely: Vercel cache, deployment lag, or config issue');
    console.log('   → NEXT ACTION: Implement fallback bypass (#3)');
    return 'DEPLOYMENT_ISSUE';
  }
  
  if (!results.directAccess) {
    console.log('🚨 ISSUE TYPE: DATA/PERMISSION PROBLEM');
    console.log('   → Cannot access chunks directly');
    console.log('   → Likely: RLS policy or tenant ID mismatch');
    console.log('   → NEXT ACTION: Fix database access');
    return 'DATA_ISSUE';
  }
  
  if (results.directAccess && results.cacheBusting) {
    console.log('✅ ISSUE TYPE: RESOLVED OR INTERMITTENT');
    console.log('   → RAG pipeline working after cache-busting');
    console.log('   → Likely: Just needed deployment propagation');
    console.log('   → NEXT ACTION: Test in browser');
    return 'RESOLVED';
  }
  
  if (results.directAccess && results.multiStrategy) {
    console.log('✅ ISSUE TYPE: QUERY-SPECIFIC PROBLEM');
    console.log('   → RAG works for specific terms but not generic queries');
    console.log('   → This is expected behavior - architecture is working');
    console.log('   → NEXT ACTION: Improve query preprocessing (Option #1)');
    return 'QUERY_ISSUE';
  }
  
  console.log('🤔 ISSUE TYPE: MIXED SIGNALS');
  console.log('   → Need manual investigation');
  return 'UNKNOWN';
}

const diagnosis = await runDiagnostics();
console.log(`\n🏁 FINAL DIAGNOSIS: ${diagnosis}`);
