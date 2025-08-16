/**
 * Local Enhanced RAG System Test
 * Tests the enhanced RAG API endpoint locally
 */

const http = require('http');

async function testLocalRAG() {
  const testQuery = {
    query: "What is the latest contract for Acme Corp?",
    tenantId: "cc863db1-5bb0-49ce-a131-fc9398d21fb7"
  };

  return new Promise((resolve, reject) => {
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
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          console.log('Status:', res.statusCode);
          console.log('Response:', JSON.stringify(response, null, 2));
          resolve(response);
        } catch (error) {
          console.error('Failed to parse response:', error);
          console.log('Raw response:', data);
          reject(error);
        }
      });
    });

    req.on('error', (error) => {
      console.error('Request failed:', error);
      reject(error);
    });

    req.write(postData);
    req.end();
  });
}

// Run test
console.log('Testing Enhanced RAG System Locally...\n');
testLocalRAG()
  .then(result => {
    console.log('\n✅ Test completed successfully');
    if (result.success) {
      console.log('Confidence:', result.confidence);
      console.log('Performance Score:', result.performanceScore);
    } else if (result.abstained) {
      console.log('System abstained:', result.reason);
    }
  })
  .catch(error => {
    console.error('\n❌ Test failed:', error.message);
  });
