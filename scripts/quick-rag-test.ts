/**
 * Quick RAG Test (No LangSmith needed)
 * 
 * Fast way to test if RAG is working before full evaluation
 */

import { queryWorkflow } from '../lib/rag';

const TESTS = [
  {
    question: "What is the TEST document about?",
    shouldFind: true,
    expectedKeywords: ["SEO", "audit", "content"],
  },
  {
    question: "What is Apache Spark?",
    shouldFind: false,
    expectedKeywords: ["don't have", "information"],
  },
  {
    question: "How many CSV files do we have?",
    shouldFind: true,
    expectedKeywords: ["csv", "logs"],
  },
];

async function main() {
  console.log('🚀 Quick RAG Test\n');
  
  const tenantId = process.env.TEST_TENANT_ID || 'b89b8fab-0a25-4266-a4d0-306cc4d358cb';
  
  let passed = 0;
  let failed = 0;
  
  for (const test of TESTS) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Q: ${test.question}`);
    console.log(`Expected to find: ${test.shouldFind ? 'YES' : 'NO (hallucination test)'}`);
    
    try {
      const result = await queryWorkflow({
        query: test.question,
        tenantId,
      });
      
      console.log(`\nA: ${result.answer}`);
      console.log(`Confidence: ${(result.confidence * 100).toFixed(1)}%`);
      console.log(`Sources: ${result.sources.length > 0 ? result.sources.map(s => s.metadata.filename).join(', ') : 'NONE'}`);
      console.log(`Chunks: ${result.sources.length}`);
      
      // Check if answer contains expected keywords
      const answer = result.answer.toLowerCase();
      const matchedKeywords = test.expectedKeywords.filter(k => answer.includes(k.toLowerCase()));
      
      const isCorrect = 
        (test.shouldFind && result.sources.length > 0 && matchedKeywords.length > 0) ||
        (!test.shouldFind && result.sources.length === 0);
      
      if (isCorrect) {
        console.log('\n✅ PASS');
        passed++;
      } else {
        console.log('\n❌ FAIL');
        console.log(`   Expected keywords: ${test.expectedKeywords.join(', ')}`);
        console.log(`   Matched: ${matchedKeywords.join(', ') || 'NONE'}`);
        failed++;
      }
      
    } catch (error: any) {
      console.log(`\n❌ ERROR: ${error.message}`);
      failed++;
    }
  }
  
  console.log(`\n${'='.repeat(60)}`);
  console.log(`\n📊 Results: ${passed}/${TESTS.length} passed (${failed} failed)`);
  
  if (failed > 0) {
    console.log('\n💡 Failures indicate:');
    console.log('  - Documents not ingested correctly');
    console.log('  - Retrieval threshold too strict');
    console.log('  - LLM hallucinating (not following instructions)');
    console.log('  - Embedding quality issues');
  }
  
  process.exit(failed > 0 ? 1 : 0);
}

main().catch(console.error);

