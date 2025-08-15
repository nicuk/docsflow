#!/usr/bin/env node

/**
 * BRUTAL SYSTEM AUDIT - Complete Platform Test
 * Tests all critical issues identified
 */

const https = require('https');
const fs = require('fs');

const DEPLOYMENT = {
  domain: 'docsflowbitto.vercel.app',
  tenantId: 'cc863db1-5bb0-49ce-a131-fc9398d21fb7', // From your logs
  testConversationId: `audit-${Date.now()}`
};

const CRITICAL_TESTS = [
  // 1. Chat API - Vector Search Error
  {
    name: '🔴 VECTOR SEARCH - Operator Error',
    path: '/api/chat',
    method: 'POST',
    data: {
      message: 'hi',
      conversationId: DEPLOYMENT.testConversationId,
      tenantId: DEPLOYMENT.tenantId
    },
    validate: (res, data, raw) => {
      // Check for the exact error from logs
      if (raw.includes('operator does not exist: extensions.vector')) {
        return '❌ CRITICAL: Vector operator error - Database schema broken!';
      }
      if (raw.includes('Vector search found 0 results')) {
        return '⚠️ Vector search returning empty (schema issue)';
      }
      if (data.response) {
        return '✅ Chat working (but check if using fallback)';
      }
      return '❌ No response generated';
    }
  },

  // 2. Document Count Test
  {
    name: '📁 DOCUMENT COUNT - Verify Tenant Isolation',
    path: '/api/documents',
    method: 'GET',
    headers: {
      'x-tenant-id': DEPLOYMENT.tenantId
    },
    validate: (res, data, raw) => {
      if (res.statusCode === 401) return '🔒 Auth required (expected)';
      if (data.documents) {
        const count = data.documents.length;
        if (count === 24) return '❌ Showing 24 docs (tenant isolation broken?)';
        if (count === 5) return '✅ Correct count (5 documents)';
        return `📊 Found ${count} documents`;
      }
      return '❓ Cannot verify document count';
    }
  },

  // 3. Image Preview Test
  {
    name: '🖼️ PNG PREVIEW - File Rendering',
    path: '/api/documents/preview',
    method: 'POST',
    data: {
      fileType: 'png',
      documentId: 'test-png-id'
    },
    validate: (res, data, raw) => {
      if (res.statusCode === 404) return '❌ Preview endpoint not found';
      if (res.statusCode === 401) return '🔒 Auth required';
      if (res.statusCode === 400) return '❌ Bad request (missing implementation?)';
      if (res.statusCode === 200) return '✅ Preview endpoint exists';
      return `❓ Unexpected status: ${res.statusCode}`;
    }
  },

  // 4. Tenant Validation
  {
    name: '🏢 TENANT ISOLATION - Security Check',
    path: '/api/chat',
    method: 'POST',
    data: {
      message: 'test',
      tenantId: 'invalid-uuid-format',
      conversationId: 'test'
    },
    validate: (res, data, raw) => {
      if (raw.includes('bypassing tenant validation')) {
        return '⚠️ Tenant validation bypassed (subdomain mode)';
      }
      if (res.statusCode === 400) return '✅ Invalid tenant rejected';
      if (res.statusCode === 200) return '❌ SECURITY: Invalid tenant accepted!';
      return `Status: ${res.statusCode}`;
    }
  },

  // 5. Database Connection
  {
    name: '💾 DATABASE - Supabase Connection',
    path: '/api/health',
    method: 'GET',
    validate: (res, data, raw) => {
      if (res.statusCode === 200) {
        if (data.database === 'connected') return '✅ Database connected';
        if (data.database === 'error') return '❌ Database connection failed';
      }
      return `❓ Health check: ${res.statusCode}`;
    }
  },

  // 6. Search Fallback Test
  {
    name: '🔍 SEARCH FALLBACK - Keyword Search',
    path: '/api/chat',
    method: 'POST',
    data: {
      message: 'revenue forecast Q3',
      conversationId: DEPLOYMENT.testConversationId,
      tenantId: DEPLOYMENT.tenantId
    },
    validate: (res, data, raw) => {
      if (raw.includes('Keyword search found 0 results')) {
        return '❌ Keyword search also failing';
      }
      if (raw.includes('Fusion produced 0 final results')) {
        return '❌ No search results at all (empty database?)';
      }
      if (data.sources && data.sources.length > 0) {
        return '✅ Search returned sources';
      }
      return '⚠️ Search may be broken';
    }
  }
];

async function runTest(test) {
  return new Promise((resolve) => {
    const options = {
      hostname: DEPLOYMENT.domain,
      path: test.path,
      method: test.method,
      headers: {
        'Content-Type': 'application/json',
        'Origin': `https://${DEPLOYMENT.domain}`,
        ...test.headers
      }
    };
    
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = data ? JSON.parse(data) : {};
          const result = test.validate(res, parsed, data);
          resolve({ 
            test: test.name, 
            status: result, 
            code: res.statusCode,
            hasError: result.includes('❌') || result.includes('CRITICAL')
          });
        } catch (e) {
          // Check raw response for specific errors
          let status = 'JSON Parse Error';
          if (data.includes('operator does not exist')) {
            status = '❌ CRITICAL: Vector operator error!';
          } else if (data.includes('Vector search found 0')) {
            status = '⚠️ Vector search empty';
          }
          resolve({ 
            test: test.name, 
            status, 
            code: res.statusCode,
            hasError: true
          });
        }
      });
    });
    
    req.on('error', (e) => {
      resolve({ 
        test: test.name, 
        status: `❌ Network Error: ${e.message}`, 
        code: 0,
        hasError: true
      });
    });
    
    if (test.data) {
      req.write(JSON.stringify(test.data));
    }
    req.end();
  });
}

async function runBrutalAudit() {
  console.log('🔥 BRUTAL SYSTEM AUDIT - COMPLETE PLATFORM TEST\n');
  console.log(`📍 Target: https://${DEPLOYMENT.domain}`);
  console.log(`🏢 Tenant: ${DEPLOYMENT.tenantId}`);
  console.log(`📅 Time: ${new Date().toISOString()}\n`);
  console.log('=' .repeat(60) + '\n');
  
  const results = [];
  for (const test of CRITICAL_TESTS) {
    console.log(`Testing: ${test.name}...`);
    const result = await runTest(test);
    results.push(result);
    console.log(`  → ${result.status}\n`);
    
    // Add delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  console.log('=' .repeat(60));
  console.log('\n📊 AUDIT RESULTS SUMMARY:\n');
  
  const critical = results.filter(r => r.status.includes('CRITICAL'));
  const errors = results.filter(r => r.hasError);
  const warnings = results.filter(r => r.status.includes('⚠️'));
  const passed = results.filter(r => r.status.includes('✅'));
  
  console.log(`🔴 Critical Issues: ${critical.length}`);
  console.log(`❌ Errors: ${errors.length}`);
  console.log(`⚠️  Warnings: ${warnings.length}`);
  console.log(`✅ Passed: ${passed.length}\n`);
  
  // Detailed breakdown
  console.log('DETAILED FINDINGS:\n');
  results.forEach(r => {
    console.log(r.status);
  });
  
  // Root cause analysis
  console.log('\n' + '=' .repeat(60));
  console.log('\n🔬 ROOT CAUSE ANALYSIS:\n');
  
  if (critical.length > 0) {
    console.log('1️⃣ DATABASE SCHEMA MISMATCH:');
    console.log('   - Embedding column is USER-DEFINED instead of vector(768)');
    console.log('   - Vector extension may not be enabled');
    console.log('   - Migration scripts not run in production\n');
  }
  
  if (errors.length > 2) {
    console.log('2️⃣ MISSING IMPLEMENTATIONS:');
    console.log('   - Document preview endpoint not implemented');
    console.log('   - Search functionality broken due to schema issues');
    console.log('   - Tenant isolation may be compromised\n');
  }
  
  console.log('🔧 IMMEDIATE ACTIONS REQUIRED:');
  console.log('1. Run EMERGENCY_VECTOR_FIX.sql in Supabase SQL Editor');
  console.log('2. Verify pgvector extension is enabled');
  console.log('3. Check tenant isolation in documents table');
  console.log('4. Implement document preview endpoint');
  console.log('5. Test with real document uploads\n');
  
  // Final verdict
  const score = passed.length / results.length * 100;
  console.log('=' .repeat(60));
  console.log(`\n🎯 PLATFORM HEALTH SCORE: ${score.toFixed(0)}%`);
  
  if (score < 30) {
    console.log('💀 CRITICAL: Platform is severely broken!');
  } else if (score < 60) {
    console.log('🔴 FAILING: Major issues preventing core functionality');
  } else if (score < 80) {
    console.log('⚠️  WARNING: Some features working but issues remain');
  } else {
    console.log('✅ OPERATIONAL: Platform mostly functional');
  }
}

// Run the audit
runBrutalAudit().catch(console.error);
