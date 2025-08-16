/**
 * Comprehensive RAG System Validation Test
 * Tests all edge cases, error handling, and integration points
 */

const http = require('http');

const TEST_CASES = [
  // Edge Case Tests
  {
    name: 'Empty Query',
    payload: { query: '', tenantId: 'test-tenant' },
    expectedError: 'empty_query'
  },
  {
    name: 'Null Query',
    payload: { query: null, tenantId: 'test-tenant' },
    expectedError: 'empty_query'
  },
  {
    name: 'Long Query',
    payload: { 
      query: 'a'.repeat(1500), 
      tenantId: 'test-tenant' 
    },
    expectedError: 'query_too_long'
  },
  {
    name: 'SQL Injection Attempt',
    payload: { 
      query: "'; DROP TABLE documents; --", 
      tenantId: 'test-tenant' 
    },
    expectedError: 'malicious_query'
  },
  {
    name: 'XSS Attempt',
    payload: { 
      query: '<script>alert("xss")</script>', 
      tenantId: 'test-tenant' 
    },
    expectedError: 'malicious_query'
  },
  
  // Valid Query Tests
  {
    name: 'Simple Valid Query',
    payload: { 
      query: 'What is the payment terms?', 
      tenantId: 'cc863db1-5bb0-49ce-a131-fc9398d21fb7' 
    },
    expectedSuccess: true
  },
  {
    name: 'Temporal Query',
    payload: { 
      query: 'Show me the latest contract for Acme Corp', 
      tenantId: 'cc863db1-5bb0-49ce-a131-fc9398d21fb7' 
    },
    expectedSuccess: true
  },
  {
    name: 'Complex Comparative Query',
    payload: { 
      query: 'Compare Q1 and Q2 revenue reports and highlight key differences', 
      tenantId: 'cc863db1-5bb0-49ce-a131-fc9398d21fb7' 
    },
    expectedSuccess: true
  }
];

async function runTest(testCase) {
  return new Promise((resolve) => {
    const postData = JSON.stringify(testCase.payload);
    
    const options = {
      hostname: 'localhost',
      port: 3001,
      path: '/api/rag-enhanced-v2',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        'x-tenant-id': testCase.payload.tenantId
      },
      timeout: 10000
    };

    const req = http.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          const passed = testCase.expectedError 
            ? response.error === testCase.expectedError
            : testCase.expectedSuccess 
              ? response.success === true
              : false;
          
          resolve({
            name: testCase.name,
            passed,
            status: res.statusCode,
            response: response,
            expected: testCase.expectedError || 'success'
          });
        } catch (error) {
          resolve({
            name: testCase.name,
            passed: false,
            error: 'Failed to parse response',
            rawData: data
          });
        }
      });
    });

    req.on('error', (error) => {
      resolve({
        name: testCase.name,
        passed: false,
        error: error.message
      });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({
        name: testCase.name,
        passed: false,
        error: 'Request timeout'
      });
    });

    req.write(postData);
    req.end();
  });
}

async function runAllTests() {
  console.log('🧪 RAG System Validation Test Suite\n');
  console.log('=' .repeat(50));
  
  const results = [];
  
  for (const testCase of TEST_CASES) {
    console.log(`\nTesting: ${testCase.name}`);
    const result = await runTest(testCase);
    results.push(result);
    
    if (result.passed) {
      console.log(`✅ PASSED`);
      if (result.response?.confidence) {
        console.log(`   Confidence: ${result.response.confidence.toFixed(2)}`);
      }
      if (result.response?.performanceScore) {
        console.log(`   Performance: ${result.response.performanceScore}/10`);
      }
    } else {
      console.log(`❌ FAILED`);
      console.log(`   Expected: ${result.expected}`);
      console.log(`   Got: ${result.response?.error || result.error}`);
    }
  }
  
  console.log('\n' + '=' .repeat(50));
  console.log('📊 Test Summary\n');
  
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  const passRate = ((passed / results.length) * 100).toFixed(1);
  
  console.log(`Total Tests: ${results.length}`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  console.log(`Pass Rate: ${passRate}%`);
  
  if (failed > 0) {
    console.log('\n⚠️  Failed Tests:');
    results.filter(r => !r.passed).forEach(r => {
      console.log(`  - ${r.name}: ${r.error || r.response?.error}`);
    });
  }
  
  return {
    passed,
    failed,
    passRate: parseFloat(passRate)
  };
}

// Run tests
console.log('Starting RAG validation tests...\n');
runAllTests()
  .then(summary => {
    if (summary.passRate === 100) {
      console.log('\n🎉 All tests passed! RAG system is production-ready.');
      process.exit(0);
    } else {
      console.log(`\n⚠️  ${summary.failed} tests failed. Review and fix issues.`);
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('\n❌ Test suite failed:', error);
    process.exit(1);
  });
