/**
 * LangSmith RAG Evaluation Script
 * 
 * Systematically tests your RAG pipeline to find issues
 * Uses OpenRouter (not OpenAI) for LLM judge
 */

// Load environment variables from .env.local
import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env.local') });

import { Client } from 'langsmith';
import { queryWorkflow } from '../lib/rag';

// Test cases - ADD YOUR OWN!
const TEST_CASES = [
  {
    inputs: { 
      question: "What is the TEST document about?",
      tenantId: "b89b8fab-0a25-4266-a4d0-306cc4d358cb"
    },
    outputs: { 
      expected_answer: "SEO / AEO / GEO Audit and content optimization",
      expected_confidence: 0.8,
      expected_sources: ["TEST.docx"]
    },
  },
  {
    inputs: { 
      question: "How many CSV files do we have?",
      tenantId: "b89b8fab-0a25-4266-a4d0-306cc4d358cb"
    },
    outputs: { 
      expected_answer: "Based on logs, there is at least 1 CSV file: logs_result.csv",
      expected_confidence: 0.7,
      expected_sources: ["logs_result.csv"]
    },
  },
  {
    inputs: { 
      question: "What is Apache Spark?",
      tenantId: "b89b8fab-0a25-4266-a4d0-306cc4d358cb"
    },
    outputs: { 
      expected_answer: "I don't have enough information to answer that question", // Should NOT hallucinate!
      expected_confidence: 0.0,
      expected_sources: []
    },
  },
];

async function main() {
  console.log('🚀 Starting RAG Evaluation...\n');
  
  const client = new Client();
  
  // Create dataset
  const datasetName = `rag-test-${Date.now()}`;
  console.log(`📊 Creating dataset: ${datasetName}`);
  
  const dataset = await client.createDataset({
    datasetName,
    description: 'RAG pipeline test cases'
  });
  
  // Add examples
  await client.createExamples({
    datasetId: dataset.id,
    examples: TEST_CASES
  });
  
  console.log(`✅ Created ${TEST_CASES.length} test cases\n`);
  
  // Define target function (YOUR RAG pipeline)
  async function target(inputs: { question: string; tenantId: string }) {
    console.log(`  🔍 Testing: "${inputs.question}"`);
    
    try {
      const result = await queryWorkflow({
        query: inputs.question,
        tenantId: inputs.tenantId,
      });
      
      return {
        answer: result.answer,
        confidence: result.confidence,
        sources: result.sources.map(s => s.metadata.filename),
        chunks_found: result.sources.length,
      };
    } catch (error: any) {
      return {
        answer: "ERROR: " + error.message,
        confidence: 0,
        sources: [],
        chunks_found: 0,
      };
    }
  }
  
  // Custom evaluator (no OpenAI needed!)
  function accuracyEvaluator(inputs: any, outputs: any, referenceOutputs: any) {
    const actual = outputs.answer.toLowerCase();
    const expected = referenceOutputs.expected_answer.toLowerCase();
    
    // Simple keyword matching (you can make this smarter)
    const keywords = expected.split(' ').filter(w => w.length > 3);
    const matchCount = keywords.filter(k => actual.includes(k)).length;
    const score = keywords.length > 0 ? matchCount / keywords.length : 0;
    
    return {
      key: 'accuracy',
      score,
      comment: `Matched ${matchCount}/${keywords.length} keywords`,
    };
  }
  
  function confidenceEvaluator(inputs: any, outputs: any, referenceOutputs: any) {
    const actualConf = outputs.confidence || 0;
    const expectedConf = referenceOutputs.expected_confidence || 0;
    
    // Check if confidence is within reasonable range
    const diff = Math.abs(actualConf - expectedConf);
    const score = Math.max(0, 1 - diff);
    
    return {
      key: 'confidence',
      score,
      comment: `Expected ${expectedConf}, got ${actualConf} (diff: ${diff.toFixed(2)})`,
    };
  }
  
  function sourceEvaluator(inputs: any, outputs: any, referenceOutputs: any) {
    const actualSources = outputs.sources || [];
    const expectedSources = referenceOutputs.expected_sources || [];
    
    if (expectedSources.length === 0 && actualSources.length === 0) {
      return { key: 'sources', score: 1.0, comment: 'Correctly returned no sources' };
    }
    
    const matchCount = expectedSources.filter((s: string) => 
      actualSources.some((a: string) => a.includes(s))
    ).length;
    
    const score = expectedSources.length > 0 ? matchCount / expectedSources.length : 0;
    
    return {
      key: 'sources',
      score,
      comment: `Found ${matchCount}/${expectedSources.length} expected sources`,
    };
  }
  
  // Run evaluation
  console.log('🧪 Running evaluation...\n');
  
  const results = await client.evaluate(target, {
    data: datasetName,
    evaluators: [
      accuracyEvaluator,
      confidenceEvaluator,
      sourceEvaluator,
    ],
    experimentPrefix: 'rag-evaluation',
    maxConcurrency: 1, // Process one at a time to see issues clearly
  });
  
  console.log('\n✅ Evaluation complete!');
  console.log(`📊 View results: ${results}`);
  console.log('\n🎯 This will show you:');
  console.log('  - Which questions fail');
  console.log('  - Why confidence is low');
  console.log('  - If sources are correct');
  console.log('  - Exact traces of each test');
}

main().catch(console.error);

