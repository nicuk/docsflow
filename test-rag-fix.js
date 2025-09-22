#!/usr/bin/env node

/**
 * 🎯 TEST RAG FIX
 * Verify that RAG now finds specific content instead of always using fallback
 */

import fetch from 'node-fetch';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
import dotenv from 'dotenv';
dotenv.config({ path: join(__dirname, '.env.local') });

const TENANT_ID = '96bbb531-dbb5-499f-bae9-416a43a87e68';
const BASE_URL = 'https://test-company.docsflow.app';

// Get auth token
async function getAuthToken() {
  const response = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Tenant-ID': TENANT_ID,
      'X-Tenant-Subdomain': 'test-company'
    },
    body: JSON.stringify({
      email: 'test@example.com',
      password: 'Testing123?'
    })
  });

  const data = await response.json();
  return data.session?.access_token;
}

// Test specific content queries
async function testRAGFix() {
  console.log('🎯 TESTING RAG FIX');
  console.log('='.repeat(50));
  console.log('Goal: Verify RAG finds actual content instead of using fallback');
  console.log('='.repeat(50));

  const authToken = await getAuthToken();
  if (!authToken) {
    console.log('❌ Failed to get auth token');
    return;
  }

  const testCases = [
    {
      query: "What was the revenue?",
      expectedInResponse: ["revenue", "2.5", "million"],
      description: "Should find specific revenue amount"
    },
    {
      query: "Tell me about TechCorp",
      expectedInResponse: ["TechCorp", "450,000", "client"],
      description: "Should find client information"
    },
    {
      query: "business challenges",
      expectedInResponse: ["challenges", "server", "costs", "competition"],
      description: "Should find challenges section"
    }
  ];

  let successCount = 0;
  
  for (const test of testCases) {
    console.log(`\n🔍 Testing: "${test.query}"`);
    console.log(`📝 Expected terms: ${test.expectedInResponse.join(', ')}`);
    
    try {
      const response = await fetch(`${BASE_URL}/api/chat`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
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
      
      const isUsingFallback = data.metadata?.strategy?.includes('fallback');
      const responseText = data.response?.toLowerCase() || '';
      const foundTerms = test.expectedInResponse.filter(term => 
        responseText.includes(term.toLowerCase())
      );
      
      console.log(`📡 Status: ${response.status}`);
      console.log(`🔧 Strategy: ${data.metadata?.strategy || 'unknown'}`);
      console.log(`🛡️ Using Fallback: ${isUsingFallback ? '❌ YES' : '✅ NO'}`);
      console.log(`📊 Sources: ${data.sources?.length || 0}`);
      console.log(`🎲 Confidence: ${data.confidence}`);
      console.log(`🎯 Found Terms: ${foundTerms.length}/${test.expectedInResponse.length} (${foundTerms.join(', ')})`);
      console.log(`📝 Response: ${data.response?.substring(0, 150)}...`);
      
      // Success criteria: Not using fallback AND finding expected terms
      const isSuccess = !isUsingFallback && foundTerms.length >= Math.ceil(test.expectedInResponse.length * 0.5);
      
      if (isSuccess) {
        console.log(`✅ SUCCESS: Found specific content!`);
        successCount++;
      } else {
        console.log(`❌ FAILED: ${isUsingFallback ? 'Still using fallback' : 'Expected terms not found'}`);
      }
      
    } catch (error) {
      console.log(`❌ Error: ${error.message}`);
    }
    
    // Wait between requests
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  console.log(`\n📊 FINAL RESULTS`);
  console.log('='.repeat(30));
  console.log(`✅ Success: ${successCount}/${testCases.length} tests passed`);
  console.log(`📈 Success Rate: ${(successCount / testCases.length * 100).toFixed(1)}%`);
  
  if (successCount === testCases.length) {
    console.log(`🎉 PERFECT! RAG is now finding specific content!`);
    console.log(`🎯 Batman/Wonder Woman problem SOLVED!`);
  } else if (successCount > 0) {
    console.log(`⚡ PARTIAL SUCCESS: RAG improvements working but need refinement`);
  } else {
    console.log(`🚨 ISSUE PERSISTS: RAG still not finding specific content`);
  }
}

testRAGFix().catch(console.error);
