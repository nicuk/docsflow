/**
 * Test if we can query the TEST.docx that shows as "Ready" in production
 * Run: npx tsx scripts/test-query-production.ts
 */

import { config } from 'dotenv';

config({ path: '.env.local' });

// Alias for local testing
if (process.env.AI_GATEWAY_API_KEY && !process.env.OPENAI_API_KEY) {
  process.env.OPENAI_API_KEY = process.env.AI_GATEWAY_API_KEY;
}

async function testProductionQuery() {
  console.log('🔍 Testing Query Against Production Pinecone\n');
  
  const testTenantId = 'b89b8fab-0a25-4266-a4d0-306cc4d358cb';
  
  try {
    // Test direct Pinecone query first
    console.log('📊 Step 1: Direct Pinecone Query');
    const { Pinecone } = await import('@pinecone-database/pinecone');
    const { generateEmbedding } = await import('../lib/rag/core/embeddings');
    
    const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY! });
    const index = pinecone.Index(process.env.PINECONE_INDEX!);
    
    // Query for TEST.docx
    const queryEmbedding = await generateEmbedding('what is in test doc');
    
    const result = await index.namespace(testTenantId).query({
      vector: queryEmbedding,
      topK: 5,
      includeMetadata: true,
    });
    
    console.log(`\n✅ Found ${result.matches.length} matches in Pinecone:`);
    result.matches.forEach((match, idx) => {
      console.log(`\n${idx + 1}. Score: ${match.score?.toFixed(4)}`);
      console.log(`   Filename: ${match.metadata?.filename}`);
      console.log(`   Document ID: ${match.metadata?.documentId}`);
      console.log(`   Text: "${(match.metadata?.text as string)?.substring(0, 80)}..."`);
    });
    
    // Now test the full query workflow
    console.log('\n\n🤖 Step 2: Full RAG Query Workflow');
    const { queryWorkflow } = await import('../lib/rag');
    
    const ragResult = await queryWorkflow({
      query: 'what is in test doc',
      tenantId: testTenantId,
      userId: 'test-user',
      topK: 5,
    });
    
    console.log('\n📊 RAG Result:');
    console.log(`   Success: ${ragResult.success}`);
    console.log(`   Abstained: ${ragResult.abstained}`);
    console.log(`   Confidence: ${ragResult.confidence}%`);
    console.log(`   Reason: ${ragResult.reason}`);
    console.log(`   Sources: ${ragResult.sources?.length || 0}`);
    console.log(`   Answer: "${ragResult.answer?.substring(0, 100)}..."`);
    
    if (ragResult.sources && ragResult.sources.length > 0) {
      console.log('\n   Source details:');
      ragResult.sources.forEach((source, idx) => {
        console.log(`     ${idx + 1}. ${source.filename} (score: ${source.score?.toFixed(4)})`);
      });
    }
    
    // Summary
    console.log('\n\n📋 DIAGNOSIS:');
    if (result.matches.length === 0) {
      console.log('❌ NO VECTORS IN PINECONE - Document was not ingested!');
      console.log('   Reason: Job failed or never ran');
      console.log('   Fix: Check worker logs, re-upload document');
    } else if (!ragResult.success || ragResult.abstained) {
      console.log('⚠️  VECTORS EXIST but RAG ABSTAINED');
      console.log(`   Reason: ${ragResult.reason}`);
      console.log('   Possible causes:');
      console.log('   - Low confidence threshold');
      console.log('   - Query preprocessing removing keywords');
      console.log('   - Generation step failing');
    } else {
      console.log('✅ EVERYTHING WORKING!');
      console.log('   Frontend issue or stale data');
    }
    
  } catch (error) {
    console.error('\n❌ TEST FAILED:', error);
    process.exit(1);
  }
}

testProductionQuery();

