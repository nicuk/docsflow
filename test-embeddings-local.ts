/**
 * Local test for embeddings - NO DEPLOYMENT NEEDED!
 * Run: npx tsx test-embeddings-local.ts
 */

import { config } from 'dotenv';
import { generateEmbedding, generateEmbeddings } from './lib/rag/core/embeddings';

// Load .env.local explicitly
config({ path: '.env.local' });

// AI SDK looks for OPENAI_API_KEY, so alias our AI_GATEWAY_API_KEY to it
if (process.env.AI_GATEWAY_API_KEY && !process.env.OPENAI_API_KEY) {
  process.env.OPENAI_API_KEY = process.env.AI_GATEWAY_API_KEY;
}

async function testEmbeddings() {
  console.log('🧪 Testing Embeddings Locally\n');
  
  // Check environment
  console.log('📋 Environment Check:');
  console.log('   AI_GATEWAY_API_KEY:', process.env.AI_GATEWAY_API_KEY ? '✅ Set' : '❌ Missing');
  console.log('');
  
  if (!process.env.AI_GATEWAY_API_KEY) {
    console.error('❌ Please set AI_GATEWAY_API_KEY in .env.local');
    process.exit(1);
  }
  
  try {
    // Test 1: Single embedding
    console.log('🧪 Test 1: Single embedding (query)');
    const start1 = Date.now();
    const embedding1 = await generateEmbedding('This is a test sentence.');
    const duration1 = Date.now() - start1;
    
    console.log(`   ✅ Success! Got ${embedding1.length}-dimensional vector`);
    console.log(`   ⏱️  Duration: ${duration1}ms`);
    console.log(`   📊 Sample values: [${embedding1.slice(0, 5).map(v => v.toFixed(4)).join(', ')}...]`);
    console.log('');
    
    // Test 2: Batch embeddings (document ingestion)
    console.log('🧪 Test 2: Batch embeddings (10 chunks)');
    const testChunks = [
      'First chunk of text',
      'Second chunk of text',
      'Third chunk with more content',
      'Fourth chunk about testing',
      'Fifth chunk about embeddings',
      'Sixth chunk about AI',
      'Seventh chunk about vectors',
      'Eighth chunk about similarity',
      'Ninth chunk about search',
      'Tenth chunk about retrieval',
    ];
    
    const start2 = Date.now();
    const embeddings2 = await generateEmbeddings(testChunks);
    const duration2 = Date.now() - start2;
    
    console.log(`   ✅ Success! Got ${embeddings2.length} embeddings`);
    console.log(`   ⏱️  Duration: ${duration2}ms (${(duration2/embeddings2.length).toFixed(0)}ms per chunk)`);
    console.log(`   📊 All vectors are ${embeddings2[0].length}-dimensional`);
    console.log('');
    
    // Test 3: Larger batch (simulate document)
    console.log('🧪 Test 3: Large batch (32 chunks, like TEST.docx)');
    const largeChunks = Array.from({ length: 32 }, (_, i) => 
      `Document chunk number ${i + 1} with some test content about various topics.`
    );
    
    const start3 = Date.now();
    const embeddings3 = await generateEmbeddings(largeChunks);
    const duration3 = Date.now() - start3;
    
    console.log(`   ✅ Success! Got ${embeddings3.length} embeddings`);
    console.log(`   ⏱️  Duration: ${duration3}ms (${(duration3/embeddings3.length).toFixed(0)}ms per chunk)`);
    console.log('');
    
    // Summary
    console.log('🎉 ALL TESTS PASSED!');
    console.log('');
    console.log('📊 Performance Summary:');
    console.log(`   Single query: ${duration1}ms`);
    console.log(`   10 chunks: ${duration2}ms total, ${(duration2/10).toFixed(0)}ms per chunk`);
    console.log(`   32 chunks: ${duration3}ms total, ${(duration3/32).toFixed(0)}ms per chunk`);
    console.log('');
    console.log('✅ Ready to deploy!');
    
  } catch (error: any) {
    console.error('❌ TEST FAILED:', error.message);
    console.error('');
    console.error('Full error:', error);
    process.exit(1);
  }
}

testEmbeddings();

