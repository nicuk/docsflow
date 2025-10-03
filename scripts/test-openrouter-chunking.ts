/**
 * Test OpenRouter LLM models for document chunking
 * This will help diagnose why DOCX files get stuck during AI chunking
 */

// Load environment variables from .env.local
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });

import { OpenRouterClient, MODEL_CONFIGS } from '../lib/openrouter-client';

const testDocumentContent = `
This is a test document about SAFT agreements.
Investment Amount: $50,000 for 10,000 tokens with 20% discount rate.
Vesting Period: 12 months from network launch.
Tokens will be delivered upon mainnet deployment.
`;

async function testOpenRouterModel(model: string): Promise<boolean> {
  const startTime = Date.now();
  console.log(`\n🧪 Testing model: ${model}`);
  console.log(`⏱️  Started at: ${new Date().toISOString()}`);
  
  const client = new OpenRouterClient();
  
  try {
    const response = await client.generate(
      model,
      [
        {
          role: 'user',
          content: `Analyze this document and provide a brief context summary in 50 words or less.

Document Title: test.docx
Document Type: Word Document
Content Sample: ${testDocumentContent}

Provide context that would help understand any section of this document. Focus on:
- What this document is about
- Key topics or subjects covered
- Document purpose or function

Context:`
        }
      ],
      {
        max_tokens: 100,
        temperature: 0.3,
        timeout: 10000 // 10 second timeout
      }
    );
    
    const duration = Date.now() - startTime;
    
    console.log(`✅ SUCCESS (${duration}ms)`);
    console.log(`📝 Response: ${response.substring(0, 200)}...`);
    
    return true;
  } catch (error) {
    const duration = Date.now() - startTime;
    
    console.error(`❌ FAILED (${duration}ms)`);
    console.error(`💥 Error: ${error instanceof Error ? error.message : String(error)}`);
    
    return false;
  }
}

async function main() {
  console.log('🚀 OpenRouter Model Testing for Document Chunking');
  console.log('='.repeat(60));
  
  // Check if API key exists
  if (!process.env.OPENROUTER_API_KEY) {
    console.error('\n❌ ERROR: OPENROUTER_API_KEY environment variable not set!');
    console.error('Please add it to your .env.local file');
    process.exit(1);
  }
  
  console.log('\n✅ OPENROUTER_API_KEY found');
  console.log('🔍 Testing models from DOCUMENT_PROCESSING config...\n');
  
  const models = MODEL_CONFIGS.DOCUMENT_PROCESSING;
  const results: { model: string; success: boolean }[] = [];
  
  for (const model of models) {
    const success = await testOpenRouterModel(model);
    results.push({ model, success });
    
    // Wait a bit between requests to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 RESULTS SUMMARY');
  console.log('='.repeat(60));
  
  results.forEach(({ model, success }) => {
    const status = success ? '✅ WORKING' : '❌ FAILED';
    console.log(`${status} - ${model}`);
  });
  
  const workingCount = results.filter(r => r.success).length;
  const totalCount = results.length;
  
  console.log('\n' + '-'.repeat(60));
  console.log(`Working Models: ${workingCount}/${totalCount}`);
  
  if (workingCount === 0) {
    console.log('\n⚠️  CRITICAL: NO MODELS ARE WORKING!');
    console.log('This is why DOCX chunking fails. Possible causes:');
    console.log('1. OpenRouter API key is invalid');
    console.log('2. OpenRouter service is down');
    console.log('3. Network/firewall issues');
    console.log('4. Models are deprecated or unavailable');
  } else if (workingCount < totalCount) {
    console.log('\n⚠️  WARNING: Some models failed but fallbacks should work');
  } else {
    console.log('\n✅ All models working! Issue might be elsewhere');
  }
}

// Run the test
main().catch(error => {
  console.error('\n💥 Test script crashed:', error);
  process.exit(1);
});

