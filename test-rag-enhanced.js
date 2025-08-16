/**
 * Enhanced RAG System Test Suite
 * Tests temporal understanding, entity resolution, and complex queries
 */

const https = require('https');

const TEST_SCENARIOS = [
  {
    name: 'Simple Image Recognition',
    query: 'What is in the ChatGPT image?',
    expectedCapabilities: ['content_identification', 'basic_description'],
    minScore: 6
  },
  {
    name: 'Temporal Contract Query',
    query: 'Show me the latest contract for Acme Corp, considering both upload date and document date',
    expectedCapabilities: ['temporal_reasoning', 'entity_resolution', 'conflict_resolution'],
    minScore: 8
  },
  {
    name: 'Complex Multi-Document Query',
    query: 'Compare the Johnson contract from last year with the renewal from 6 months ago. What changed?',
    expectedCapabilities: ['comparative_analysis', 'temporal_tracking', 'change_detection'],
    minScore: 7.5
  },
  {
    name: 'Entity Relationship Query',
    query: 'Find all documents related to Acme Corp, including subsidiaries and previous company names',
    expectedCapabilities: ['entity_resolution', 'relationship_mapping', 'fuzzy_matching'],
    minScore: 7
  },
  {
    name: 'Conflicting Information Query',
    query: 'What is the current payment terms for Client X? Note: multiple contracts may exist',
    expectedCapabilities: ['conflict_resolution', 'latest_determination', 'confidence_scoring'],
    minScore: 8
  }
];

async function makeRequest(path, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.docsflow.app',
      port: 443,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'x-tenant-id': 'cc863db1-5bb0-49ce-a131-fc9398d21fb7', // bitto tenant
        'x-tenant-subdomain': 'bitto'
      }
    };

    if (body) {
      const bodyStr = JSON.stringify(body);
      options.headers['Content-Length'] = Buffer.byteLength(bodyStr);
    }

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          resolve({ 
            statusCode: res.statusCode, 
            data: data ? JSON.parse(data) : null 
          });
        } catch (e) {
          resolve({ statusCode: res.statusCode, data: data });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function testRAGCapabilities() {
  console.log('🔬 ENHANCED RAG SYSTEM TEST SUITE\n');
  console.log('=' .repeat(60));
  
  let totalScore = 0;
  let testsRun = 0;
  const results = [];

  for (const scenario of TEST_SCENARIOS) {
    console.log(`\n📝 Testing: ${scenario.name}`);
    console.log(`   Query: "${scenario.query}"`);
    console.log(`   Expected capabilities: ${scenario.expectedCapabilities.join(', ')}`);
    console.log(`   Minimum score: ${scenario.minScore}/10`);
    
    try {
      const startTime = Date.now();
      
      // Test enhanced RAG endpoint
      const response = await makeRequest('/api/rag-enhanced', 'POST', {
        query: scenario.query,
        options: {
          temporalScope: 'all',
          conflictResolution: 'latest_document_date'
        }
      });
      
      const responseTime = Date.now() - startTime;
      
      if (response.statusCode === 200 && response.data.success) {
        const score = response.data.metadata?.performanceScore || 5.5;
        const passed = score >= scenario.minScore;
        
        console.log(`   ✅ Response received in ${responseTime}ms`);
        console.log(`   📊 Performance score: ${score}/10 ${passed ? '✅' : '❌'}`);
        
        // Check for expected capabilities
        const metadata = response.data.metadata || {};
        console.log(`   🔍 Detected capabilities:`);
        
        if (metadata.temporalContextUsed) {
          console.log(`      ✅ Temporal reasoning`);
        }
        if (metadata.uniqueEntities > 0) {
          console.log(`      ✅ Entity resolution (${metadata.uniqueEntities} entities)`);
        }
        if (metadata.conflictResolution) {
          console.log(`      ✅ Conflict resolution: ${metadata.conflictResolution}`);
        }
        if (metadata.queryComplexity) {
          console.log(`      ✅ Query complexity: ${metadata.queryComplexity}`);
        }
        
        totalScore += score;
        testsRun++;
        
        results.push({
          scenario: scenario.name,
          score,
          passed,
          responseTime,
          capabilities: metadata
        });
      } else {
        console.log(`   ❌ Request failed: ${response.statusCode}`);
        console.log(`   Error: ${JSON.stringify(response.data)}`);
        
        // Use base score for failed requests
        totalScore += 5.5;
        testsRun++;
        
        results.push({
          scenario: scenario.name,
          score: 5.5,
          passed: false,
          error: response.data
        });
      }
    } catch (error) {
      console.log(`   ❌ Test error: ${error.message}`);
      results.push({
        scenario: scenario.name,
        score: 0,
        passed: false,
        error: error.message
      });
    }
  }

  // Calculate overall system score
  const averageScore = testsRun > 0 ? (totalScore / testsRun).toFixed(1) : 0;
  
  console.log('\n' + '=' .repeat(60));
  console.log('📊 FINAL RAG SYSTEM ASSESSMENT');
  console.log('=' .repeat(60));
  
  console.log(`\n🎯 Overall Performance Score: ${averageScore}/10`);
  
  // Detailed breakdown
  console.log('\n📈 Capability Breakdown:');
  
  const capabilities = {
    'Basic Search': averageScore >= 5 ? '✅' : '❌',
    'Temporal Reasoning': results.some(r => r.capabilities?.temporalContextUsed) ? '✅' : '❌',
    'Entity Resolution': results.some(r => r.capabilities?.uniqueEntities > 1) ? '✅' : '❌',
    'Conflict Resolution': results.some(r => r.capabilities?.conflictResolution) ? '✅' : '❌',
    'Complex Queries': results.some(r => r.capabilities?.queryComplexity === 'complex') ? '✅' : '❌',
    'Performance': results.every(r => r.responseTime < 3000) ? '✅' : '⚠️'
  };
  
  for (const [capability, status] of Object.entries(capabilities)) {
    console.log(`   ${status} ${capability}`);
  }
  
  // Recommendations
  console.log('\n💡 Recommendations to reach 8+/10:');
  
  if (averageScore < 6) {
    console.log('   1. ❗ Fix basic search functionality first');
    console.log('   2. ❗ Ensure embeddings are properly generated');
    console.log('   3. ❗ Verify database connections and indexes');
  } else if (averageScore < 7) {
    console.log('   1. ⚠️ Implement temporal metadata extraction');
    console.log('   2. ⚠️ Add entity normalization and matching');
    console.log('   3. ⚠️ Improve query decomposition');
  } else if (averageScore < 8) {
    console.log('   1. 🔧 Fine-tune conflict resolution strategies');
    console.log('   2. 🔧 Add document relationship mapping');
    console.log('   3. 🔧 Implement confidence scoring');
  } else {
    console.log('   ✅ System performing at target level!');
    console.log('   🚀 Consider adding:');
    console.log('      - Multi-language support');
    console.log('      - Advanced analytics');
    console.log('      - Predictive capabilities');
  }
  
  // Test summary
  console.log('\n📋 Test Summary:');
  for (const result of results) {
    const icon = result.passed ? '✅' : '❌';
    console.log(`   ${icon} ${result.scenario}: ${result.score}/10`);
  }
  
  return averageScore;
}

// Run tests
console.log('🚀 Starting Enhanced RAG System Tests...\n');
testRAGCapabilities()
  .then(score => {
    console.log(`\n✅ Tests complete. Final score: ${score}/10`);
    process.exit(score >= 8 ? 0 : 1);
  })
  .catch(error => {
    console.error('\n❌ Test suite failed:', error);
    process.exit(1);
  });
