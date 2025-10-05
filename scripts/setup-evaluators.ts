/**
 * LangSmith Evaluators Setup
 * 
 * Creates automated evaluators to test RAG quality
 * Uses OpenRouter (free Gemini) instead of expensive OpenAI o3-mini
 */

import { Client } from 'langsmith';
import { queryWorkflow } from '../lib/rag';

// Initialize LangSmith client
const client = new Client();

// Test dataset - these questions test different aspects
const TEST_DATASET = [
  {
    inputs: { 
      question: "What is the TEST document about?",
      tenantId: "b89b8fab-0a25-4266-a4d0-306cc4d358cb"
    },
    outputs: { 
      // Expected behavior
      shouldHaveAnswer: true,
      minConfidence: 0.3,
      expectedKeywords: ["SEO", "audit", "content"],
    },
  },
  {
    inputs: { 
      question: "What is Apache Spark?", // Not in docs
      tenantId: "b89b8fab-0a25-4266-a4d0-306cc4d358cb"
    },
    outputs: { 
      shouldHaveAnswer: false, // Should abstain
      maxConfidence: 0.1,
      expectedKeywords: ["don't have", "information"],
    },
  },
  {
    inputs: { 
      question: "How many CSV files are there?",
      tenantId: "b89b8fab-0a25-4266-a4d0-306cc4d358cb"
    },
    outputs: { 
      shouldHaveAnswer: true,
      minConfidence: 0.3,
      expectedKeywords: ["csv", "file"],
    },
  },
];

// FREE Evaluators (no LLM needed!)

function hallucinationEvaluator(inputs: any, outputs: any, referenceOutputs: any) {
  const shouldHaveAnswer = referenceOutputs.shouldHaveAnswer;
  const actualAnswer = outputs.answer || '';
  const hasAnswer = actualAnswer.length > 0 && !actualAnswer.includes("don't have");
  
  // Check if system correctly abstained or answered
  const correct = shouldHaveAnswer ? hasAnswer : !hasAnswer;
  
  return {
    key: 'no_hallucination',
    score: correct ? 1.0 : 0.0,
    comment: correct 
      ? '✅ Correctly handled question'
      : shouldHaveAnswer 
        ? '❌ Should have answered but abstained'
        : '❌ Hallucinated answer when should have abstained',
  };
}

function confidenceEvaluator(inputs: any, outputs: any, referenceOutputs: any) {
  const actualConf = outputs.confidence || 0;
  const minConf = referenceOutputs.minConfidence || 0;
  const maxConf = referenceOutputs.maxConfidence || 1;
  
  const inRange = actualConf >= minConf && actualConf <= maxConf;
  
  return {
    key: 'confidence_range',
    score: inRange ? 1.0 : 0.0,
    comment: `Confidence: ${(actualConf * 100).toFixed(1)}% (expected: ${(minConf * 100).toFixed(0)}-${(maxConf * 100).toFixed(0)}%)`,
  };
}

function keywordEvaluator(inputs: any, outputs: any, referenceOutputs: any) {
  const answer = (outputs.answer || '').toLowerCase();
  const expectedKeywords = referenceOutputs.expectedKeywords || [];
  
  if (expectedKeywords.length === 0) {
    return { key: 'keyword_match', score: 1.0, comment: 'No keywords to check' };
  }
  
  const matchedCount = expectedKeywords.filter((kw: string) => 
    answer.includes(kw.toLowerCase())
  ).length;
  
  const score = matchedCount / expectedKeywords.length;
  
  return {
    key: 'keyword_match',
    score,
    comment: `Matched ${matchedCount}/${expectedKeywords.length} expected keywords`,
  };
}

function latencyEvaluator(inputs: any, outputs: any, referenceOutputs: any) {
  const duration = outputs.metrics?.duration || 0;
  const maxLatency = 10000; // 10 seconds max
  
  const score = duration <= maxLatency ? 1.0 : Math.max(0, 1 - (duration - maxLatency) / maxLatency);
  
  return {
    key: 'latency',
    score,
    comment: `Response time: ${duration}ms (target: <${maxLatency}ms)`,
  };
}

// Target function (your RAG pipeline)
async function ragTarget(inputs: { question: string; tenantId: string }) {
  const startTime = Date.now();
  
  try {
    const result = await queryWorkflow({
      query: inputs.question,
      tenantId: inputs.tenantId,
    });
    
    return {
      answer: result.answer || '',
      confidence: result.confidence,
      sources: result.sources?.length || 0,
      metrics: {
        duration: Date.now() - startTime,
        model: result.metrics?.model,
        chunksRetrieved: result.metrics?.chunksRetrieved,
      },
    };
  } catch (error: any) {
    return {
      answer: '',
      confidence: 0,
      sources: 0,
      error: error.message,
      metrics: {
        duration: Date.now() - startTime,
      },
    };
  }
}

async function main() {
  console.log('🚀 Setting up LangSmith Evaluators...\n');
  
  // 1. Create dataset
  const datasetName = `rag-evaluation-${Date.now()}`;
  console.log(`📊 Creating dataset: ${datasetName}`);
  
  const dataset = await client.createDataset({
    datasetName,
    description: 'RAG evaluation dataset with hallucination tests'
  });
  
  await client.createExamples({
    datasetId: dataset.id,
    examples: TEST_DATASET
  });
  
  console.log(`✅ Created ${TEST_DATASET.length} test cases\n`);
  
  // 2. Run evaluation
  console.log('🧪 Running evaluation...\n');
  
  const results = await client.evaluate(ragTarget, {
    data: datasetName,
    evaluators: [
      hallucinationEvaluator,
      confidenceEvaluator,
      keywordEvaluator,
      latencyEvaluator,
    ],
    experimentPrefix: 'rag-quality-check',
    maxConcurrency: 1,
  });
  
  console.log('\n✅ Evaluation complete!');
  console.log(`📊 View results: ${results}`);
  console.log('\n🎯 Evaluators running:');
  console.log('  - Hallucination Detection (FREE)');
  console.log('  - Confidence Range Check (FREE)');
  console.log('  - Keyword Matching (FREE)');
  console.log('  - Latency Monitoring (FREE)');
  console.log('\n💡 These run automatically on every test!');
}

main().catch(console.error);

