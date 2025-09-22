#!/usr/bin/env node

/**
 * 🔍 DEBUG CHAT API RESPONSE
 * Check why Chat API returns undefined response
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
const TEST_TOKEN = 'eyJhbGciOiJIUzI1NiIsImtpZCI6IndJVnZLekpxUThYamVhOVEiLCJ0eXAiOiJKV1QifQ.eyJpc3MiOiJodHRwczovL2xoY29wd3dpcXdqcHpiZG5qb3ZvLnN1cGFiYXNlLmNvL2F1dGgvdjEiLCJzdWIiOiI4NWY5NjIzYi05Nzc1LTQzNzUtYmQ3OS0yZTNlMmJlZmNmODkiLCJhdWQiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjoxNzU4NTYxNjMxLCJpYXQiOjE3NTg1NTgwMzEsImVtYWlsIjoidGVzdEBleGFtcGxlLmNvbSIsInBob25lIjoiIiwiYXBwX21ldGFkYXRhIjp7InByb3ZpZGVyIjoiZW1haWwiLCJwcm92aWRlcnMiOlsiZW1haWwiXX0sInVzZXJfbWV0YWRhdGEiOnsiZW1haWxfdmVyaWZpZWQiOnRydWUsIm5hbWUiOiJUZXN0IFVzZXIiLCJyb2xlIjoiYWRtaW4ifSwicm9sZSI6ImF1dGhlbnRpY2F0ZWQiLCJhYWwiOiJhYWwxIiwiYW1yIjpbeyJtZXRob2QiOiJwYXNzd29yZCIsInRpbWVzdGFtcCI6MTc1ODU1ODAzMX1dLCJzZXNzaW9uX2lkIjoiNmY1YThhNmMtMzY5NC00YjY3LWEyYTMtYTA2NDgwNTE2Y2YzIiwiaXNfYW5vbnltb3VzIjpmYWxzZX0.Yp-77G_knX0HTiZjkJio_BUNKRJRBvotJn26SNZdbZc';

async function testChatAPIDetailed() {
  console.log('🔍 DETAILED CHAT API TEST');
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
        message: 'What is the content about? What information do you have?',
        conversationId: null
      })
    });

    console.log(`📡 Status: ${response.status} ${response.statusText}`);
    console.log(`📡 Headers:`, Object.fromEntries(response.headers.entries()));
    
    const responseText = await response.text();
    console.log(`📄 Raw Response Text (${responseText.length} chars):`);
    console.log(responseText.substring(0, 500) + (responseText.length > 500 ? '...' : ''));
    
    // Try to parse as JSON
    try {
      const jsonData = JSON.parse(responseText);
      console.log(`\n📊 Parsed JSON Structure:`);
      console.log(`   Keys: ${Object.keys(jsonData)}`);
      
      if (jsonData.response) {
        console.log(`   Response: ${jsonData.response.substring(0, 200)}...`);
      } else {
        console.log(`   ❌ No 'response' field in JSON`);
        console.log(`   Full JSON:`, jsonData);
      }
      
      return jsonData;
    } catch (parseError) {
      console.log(`❌ JSON Parse Error: ${parseError.message}`);
      console.log(`   Raw response was not valid JSON`);
      return null;
    }

  } catch (error) {
    console.error('❌ Network Error:', error.message);
    return null;
  }
}

// Test different queries
async function testMultipleQueries() {
  const queries = [
    'What documents do you have?',
    'Tell me about ledger',
    'What is this about?',
    'Help me understand the content'
  ];

  for (const query of queries) {
    console.log(`\n🔍 Testing query: "${query}"`);
    console.log('-'.repeat(40));
    
    const result = await testChatAPIDetailed();
    if (result && result.response) {
      console.log(`✅ Success: ${result.response.substring(0, 100)}...`);
    } else {
      console.log(`❌ Failed or undefined response`);
    }
    
    // Wait 2 seconds between requests
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
}

testMultipleQueries().catch(console.error);
