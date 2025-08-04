#!/usr/bin/env node

/**
 * Environment Verification Script
 * Validates that all required environment variables and services are working
 */

const https = require('https');
const http = require('http');

console.log('🔍 ENVIRONMENT VERIFICATION STARTING...\n');

// Check environment variables
console.log('📋 CHECKING ENVIRONMENT VARIABLES:');
const requiredEnvVars = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'KV_REST_API_URL',
  'KV_REST_API_TOKEN',
  'GOOGLE_AI_API_KEY'
];

let envIssues = [];
requiredEnvVars.forEach(envVar => {
  const value = process.env[envVar];
  if (!value) {
    console.log(`❌ ${envVar}: MISSING`);
    envIssues.push(envVar);
  } else {
    console.log(`✅ ${envVar}: Present (${value.substring(0, 10)}...)`);
  }
});

if (envIssues.length > 0) {
  console.log(`\n🚨 MISSING ENVIRONMENT VARIABLES: ${envIssues.join(', ')}`);
  console.log('Add these to your .env.local file or Vercel environment variables.\n');
} else {
  console.log('\n✅ ALL ENVIRONMENT VARIABLES PRESENT\n');
}

// Test API endpoints
console.log('🌐 TESTING API ENDPOINTS:');

const testEndpoints = [
  { name: 'Redis Test', path: '/api/test/redis' },
  { name: 'Tenant Context Test', path: '/api/test/tenant-context?tenant=demo' },
  { name: 'Health Check', path: '/api/health' }
];

async function testEndpoint(endpoint) {
  return new Promise((resolve) => {
    const url = `http://localhost:3000${endpoint.path}`;
    const request = http.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          console.log(`✅ ${endpoint.name}: ${res.statusCode} - ${parsed.success ? 'SUCCESS' : 'PARTIAL'}`);
          resolve({ success: true, status: res.statusCode, data: parsed });
        } catch (error) {
          console.log(`❌ ${endpoint.name}: ${res.statusCode} - INVALID JSON`);
          resolve({ success: false, status: res.statusCode, error: 'Invalid JSON' });
        }
      });
    });
    
    request.on('error', (error) => {
      console.log(`❌ ${endpoint.name}: CONNECTION FAILED - ${error.message}`);
      resolve({ success: false, error: error.message });
    });
    
    request.setTimeout(5000, () => {
      console.log(`❌ ${endpoint.name}: TIMEOUT`);
      request.destroy();
      resolve({ success: false, error: 'Timeout' });
    });
  });
}

async function runTests() {
  console.log('Starting API endpoint tests...\n');
  
  for (const endpoint of testEndpoints) {
    await testEndpoint(endpoint);
  }
  
  console.log('\n📊 VERIFICATION COMPLETE');
  console.log('\nNEXT STEPS:');
  console.log('1. If Redis test fails: Check KV environment variables');
  console.log('2. If tenant test fails: Check Supabase configuration');
  console.log('3. If all pass: Environment is ready for RLS deployment');
  console.log('\nRun: npm run dev (in another terminal) then node scripts/verify-environment.js');
}

// Only run tests if server might be running
if (process.argv.includes('--test-apis')) {
  runTests();
} else {
  console.log('\n💡 To test API endpoints, run: node scripts/verify-environment.js --test-apis');
  console.log('(Make sure your dev server is running first: npm run dev)\n');
}
