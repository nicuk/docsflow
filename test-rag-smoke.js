/**
 * Smoke test for RAG Enhanced v2 API
 */

const http = require('http');

async function smokeTest() {
  const testQuery = {
    query: 'What are the payment terms?',
    tenantId: 'cc863db1-5bb0-49ce-a131-fc9398d21fb7'
  };

  const postData = JSON.stringify(testQuery);
  
  const options = {
    hostname: 'localhost',
    port: 3001,
    path: '/api/rag-enhanced-v2',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData),
      'x-tenant-id': testQuery.tenantId
    },
    timeout: 30000
  };

  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          console.log('🚀 Smoke Test Results\n');
          console.log('Status Code:', res.statusCode);
          console.log('Success:', response.success || false);
          
          if (response.success) {
            console.log('✅ RAG Enhanced v2 API is working!');
            console.log('\nResponse Summary:');
            console.log('- Answer:', response.answer?.substring(0, 100) + '...');
            console.log('- Confidence:', response.confidence?.toFixed(2));
            console.log('- Performance Score:', response.performanceScore);
            console.log('- Documents Used:', response.sources?.length || 0);
            console.log('- Response Time:', response.responseTime, 'ms');
          } else {
            console.log('❌ API returned error:');
            console.log('- Error:', response.error);
            console.log('- Message:', response.message);
            console.log('- Suggested Action:', response.suggestedAction);
          }
          
          resolve(response);
        } catch (error) {
          console.error('❌ Failed to parse response:', error.message);
          console.log('Raw response:', data);
          reject(error);
        }
      });
    });

    req.on('error', (error) => {
      console.error('❌ Request failed:', error.message);
      reject(error);
    });

    req.on('timeout', () => {
      req.destroy();
      console.error('❌ Request timeout after 30 seconds');
      reject(new Error('Request timeout'));
    });

    req.write(postData);
    req.end();
  });
}

// Run smoke test
console.log('🔥 Running RAG Enhanced v2 Smoke Test...\n');
console.log('Target: http://localhost:3001/api/rag-enhanced-v2');
console.log('Query: "What are the payment terms?"');
console.log('=' .repeat(50) + '\n');

smokeTest()
  .then(() => {
    console.log('\n✅ Smoke test completed successfully');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Smoke test failed:', error.message);
    process.exit(1);
  });
