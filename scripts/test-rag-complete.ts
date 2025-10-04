/**
 * COMPREHENSIVE RAG TESTING SUITE
 * Tests EVERYTHING locally before deploying
 * Run: npx tsx scripts/test-rag-complete.ts
 */

import { config } from 'dotenv';
import fs from 'fs';
import path from 'path';

config({ path: '.env.local' });

// Alias for local testing
if (process.env.AI_GATEWAY_API_KEY && !process.env.OPENAI_API_KEY) {
  process.env.OPENAI_API_KEY = process.env.AI_GATEWAY_API_KEY;
}

interface TestResult {
  test: string;
  status: 'pass' | 'fail';
  score?: number;
  details?: string;
  duration?: number;
}

const results: TestResult[] = [];

function logTest(result: TestResult) {
  results.push(result);
  const icon = result.status === 'pass' ? '✅' : '❌';
  const scoreText = result.score !== undefined ? ` (${result.score}/10)` : '';
  const durationText = result.duration ? ` [${result.duration}ms]` : '';
  console.log(`${icon} ${result.test}${scoreText}${durationText}`);
  if (result.details) console.log(`   ${result.details}`);
}

async function testAll() {
  console.log('🔬 COMPREHENSIVE RAG TEST SUITE\n');
  console.log('Testing: Document Processing → Embeddings → Retrieval → LLM Response\n');
  
  const testTenantId = 'b89b8fab-0a25-4266-a4d0-306cc4d358cb';
  
  // ========================================
  // TEST 1: Document Loaders
  // ========================================
  console.log('\n📄 TEST GROUP 1: Document Loaders');
  
  try {
    // Test DOCX Loader
    const docxStart = Date.now();
    const { DocxLoader } = await import('@langchain/community/document_loaders/fs/docx');
    const testDocx = path.join(process.cwd(), 'test-sample.docx');
    
    if (!fs.existsSync(testDocx)) {
      logTest({
        test: 'DOCX Loader',
        status: 'fail',
        score: 0,
        details: 'No test-sample.docx found. Create one to test.'
      });
    } else {
      const docxLoader = new DocxLoader(testDocx);
      const docs = await docxLoader.load();
      logTest({
        test: 'DOCX Loader',
        status: 'pass',
        score: 10,
        duration: Date.now() - docxStart,
        details: `Loaded ${docs.length} pages, ${docs[0].pageContent.length} chars`
      });
    }
  } catch (error: any) {
    logTest({
      test: 'DOCX Loader',
      status: 'fail',
      score: 0,
      details: error.message
    });
  }
  
  // Test PDF Loader
  try {
    const pdfStart = Date.now();
    const { PDFLoader } = await import('langchain/document_loaders/fs/pdf');
    const testPdf = path.join(process.cwd(), 'test-sample.pdf');
    
    if (!fs.existsSync(testPdf)) {
      logTest({
        test: 'PDF Loader',
        status: 'fail',
        score: 0,
        details: 'No test-sample.pdf found. Create one to test.'
      });
    } else {
      const pdfLoader = new PDFLoader(testPdf);
      const docs = await pdfLoader.load();
      logTest({
        test: 'PDF Loader',
        status: 'pass',
        score: 10,
        duration: Date.now() - pdfStart,
        details: `Loaded ${docs.length} pages`
      });
    }
  } catch (error: any) {
    logTest({
      test: 'PDF Loader',
      status: 'fail',
      score: 0,
      details: error.message
    });
  }
  
  // ========================================
  // TEST 2: Embeddings
  // ========================================
  console.log('\n🔗 TEST GROUP 2: Embeddings');
  
  try {
    const embStart = Date.now();
    const { generateEmbedding, generateEmbeddings } = await import('../lib/rag/core/embeddings');
    
    // Test single embedding
    const singleEmb = await generateEmbedding('This is a test document about RAG systems.');
    logTest({
      test: 'Single Embedding',
      status: singleEmb.length === 1536 ? 'pass' : 'fail',
      score: singleEmb.length === 1536 ? 10 : 0,
      duration: Date.now() - embStart,
      details: `Dimensions: ${singleEmb.length}`
    });
    
    // Test batch embeddings
    const batchStart = Date.now();
    const batchEmb = await generateEmbeddings([
      'First chunk about pricing',
      'Second chunk about features',
      'Third chunk about support'
    ]);
    logTest({
      test: 'Batch Embeddings',
      status: batchEmb.length === 3 ? 'pass' : 'fail',
      score: batchEmb.length === 3 ? 10 : 0,
      duration: Date.now() - batchStart,
      details: `Generated ${batchEmb.length} embeddings`
    });
  } catch (error: any) {
    logTest({
      test: 'Embeddings',
      status: 'fail',
      score: 0,
      details: error.message
    });
  }
  
  // ========================================
  // TEST 3: Pinecone Connection
  // ========================================
  console.log('\n💾 TEST GROUP 3: Pinecone');
  
  try {
    const pineconeStart = Date.now();
    const { Pinecone } = await import('@pinecone-database/pinecone');
    const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY! });
    const index = pinecone.Index(process.env.PINECONE_INDEX!);
    
    // Test query
    const testVector = new Array(1536).fill(0.1);
    const result = await index.namespace(testTenantId).query({
      vector: testVector,
      topK: 3,
      includeMetadata: true,
    });
    
    logTest({
      test: 'Pinecone Query',
      status: 'pass',
      score: 10,
      duration: Date.now() - pineconeStart,
      details: `Found ${result.matches.length} vectors in namespace`
    });
  } catch (error: any) {
    logTest({
      test: 'Pinecone Query',
      status: 'fail',
      score: 0,
      details: error.message
    });
  }
  
  // ========================================
  // TEST 4: Full Query Workflow
  // ========================================
  console.log('\n🤖 TEST GROUP 4: Full RAG Workflow');
  
  try {
    const queryStart = Date.now();
    const { queryWorkflow } = await import('../lib/rag');
    
    const result = await queryWorkflow({
      query: 'what documents do we have?',
      tenantId: testTenantId,
      userId: 'test-user',
      topK: 5,
    });
    
    const score = result.success && !result.abstained ? 10 : 
                  result.success && result.confidence > 0 ? 7 : 
                  result.sources && result.sources.length > 0 ? 5 : 0;
    
    logTest({
      test: 'Full Query Workflow',
      status: result.success && !result.abstained ? 'pass' : 'fail',
      score,
      duration: Date.now() - queryStart,
      details: `Confidence: ${result.confidence}%, Sources: ${result.sources?.length || 0}, Answer: ${result.answer?.substring(0, 50)}...`
    });
    
    // Log actual similarity scores
    if (result.sources && result.sources.length > 0) {
      console.log('\n   📊 Similarity Scores:');
      result.sources.slice(0, 3).forEach((source, idx) => {
        console.log(`      ${idx + 1}. ${source.score?.toFixed(4)} - ${source.filename}`);
      });
    }
  } catch (error: any) {
    logTest({
      test: 'Full Query Workflow',
      status: 'fail',
      score: 0,
      details: error.message
    });
  }
  
  // ========================================
  // TEST 5: LLM Quality
  // ========================================
  console.log('\n🧠 TEST GROUP 5: LLM Response Quality');
  
  try {
    const llmStart = Date.now();
    const { generateAnswer } = await import('../lib/rag/core/generation');
    
    const testContext = [
      { text: 'Our pricing starts at $29/month for the starter plan.', filename: 'pricing.pdf', score: 0.85 },
      { text: 'Enterprise plans include 24/7 support and custom integrations.', filename: 'features.pdf', score: 0.78 }
    ];
    
    const answer = await generateAnswer(
      'what is the pricing?',
      testContext
    );
    
    // Score based on answer quality
    const hasPrice = answer.toLowerCase().includes('$29') || answer.toLowerCase().includes('29');
    const hasPlan = answer.toLowerCase().includes('starter') || answer.toLowerCase().includes('plan');
    const isCoherent = answer.length > 20 && answer.length < 500;
    
    const score = (hasPrice ? 4 : 0) + (hasPlan ? 3 : 0) + (isCoherent ? 3 : 0);
    
    logTest({
      test: 'LLM Response Quality',
      status: score >= 7 ? 'pass' : 'fail',
      score,
      duration: Date.now() - llmStart,
      details: `Answer: "${answer.substring(0, 100)}..."`
    });
  } catch (error: any) {
    logTest({
      test: 'LLM Response Quality',
      status: 'fail',
      score: 0,
      details: error.message
    });
  }
  
  // ========================================
  // FINAL REPORT
  // ========================================
  console.log('\n' + '='.repeat(60));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(60));
  
  const passed = results.filter(r => r.status === 'pass').length;
  const failed = results.filter(r => r.status === 'fail').length;
  const avgScore = results.reduce((sum, r) => sum + (r.score || 0), 0) / results.length;
  
  console.log(`\n✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📈 Average Score: ${avgScore.toFixed(1)}/10`);
  
  if (avgScore >= 8) {
    console.log('\n🎉 EXCELLENT! System is production-ready!');
  } else if (avgScore >= 6) {
    console.log('\n⚠️  GOOD, but needs improvements before production.');
  } else {
    console.log('\n🚨 CRITICAL ISSUES! Do NOT deploy!');
  }
  
  console.log('\n💡 Recommendations:');
  results.filter(r => r.status === 'fail').forEach(r => {
    console.log(`   - Fix: ${r.test}`);
    if (r.details) console.log(`     ${r.details}`);
  });
}

testAll().catch(console.error);

