/**
 * Local Upload Test
 * 
 * Tests the complete upload → processing → embedding → Pinecone flow
 * WITHOUT deploying to production
 */

// Load environment variables
import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env.local') });

import { createClient } from '@supabase/supabase-js';
import { processDocumentWithLangChain } from '../app/api/queue/worker/langchain-processor';
import * as fs from 'fs';

const TENANT_ID = 'b89b8fab-0a25-4266-a4d0-306cc4d358cb';

async function testUpload() {
  console.log('🧪 Testing Upload Pipeline Locally...\n');
  
  // Initialize Supabase
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  
  // Create test document record
  console.log('1️⃣ Creating test document in DB...');
  const { data: doc, error: docError } = await supabase
    .from('documents')
    .insert({
      tenant_id: TENANT_ID,
      filename: 'LOCAL_TEST.txt',
      file_size: 100,
      mime_type: 'text/plain',
      processing_status: 'pending',
    })
    .select()
    .single();
  
  if (docError || !doc) {
    console.error('❌ Failed to create document:', docError);
    return;
  }
  
  console.log(`✅ Document created: ${doc.id}\n`);
  
  // Create test ingestion job
  console.log('2️⃣ Creating ingestion job...');
  const { data: job, error: jobError } = await supabase
    .from('ingestion_jobs')
    .insert({
      tenant_id: TENANT_ID,
      document_id: doc.id,
      filename: 'LOCAL_TEST.txt',
      file_type: 'text/plain',
      file_path: 'test://local',
      status: 'pending',
    })
    .select()
    .single();
  
  if (jobError || !job) {
    console.error('❌ Failed to create job:', jobError);
    return;
  }
  
  console.log(`✅ Job created: ${job.id}\n`);
  
  // Create test file content
  const testContent = `
TEST DOCUMENT FOR LOCAL VALIDATION

This is a test document to verify the LangChain processor works correctly.

Key Information:
- LangSmith tracing is enabled
- Embeddings use Vercel AI Gateway or OpenAI
- Vectors are stored in Pinecone
- Chunking uses RecursiveCharacterTextSplitter

Expected Behavior:
✅ Should successfully parse this text
✅ Should create multiple chunks
✅ Should generate embeddings
✅ Should upsert to Pinecone
✅ Should mark job as completed
  `.trim();
  
  const testBlob = new Blob([testContent], { type: 'text/plain' });
  
  // Test the processor
  console.log('3️⃣ Testing processDocumentWithLangChain...\n');
  
  try {
    const startTime = Date.now();
    
    await processDocumentWithLangChain(
      job,
      testBlob,
      supabase
    );
    
    const duration = Date.now() - startTime;
    
    console.log(`\n✅ Processing completed in ${duration}ms!\n`);
    
    // Verify document status (processor updates documents table, not jobs table)
    console.log('4️⃣ Verifying document status...');
    const { data: updatedDoc } = await supabase
      .from('documents')
      .select('*')
      .eq('id', doc.id)
      .single();
    
    console.log(`Document status: ${updatedDoc?.processing_status}`);
    console.log(`Chunks processed: ${updatedDoc?.metadata?.chunk_count || 0}`);
    console.log(`Parse method: ${updatedDoc?.metadata?.parse_method || 'unknown'}`);
    
    if (updatedDoc?.processing_status === 'completed') {
      console.log('\n🎉 SUCCESS! Upload pipeline is working!\n');
      console.log('✅ traceable import is working');
      console.log('✅ LangChain processor is working');
      console.log('✅ Embeddings are working');
      console.log('✅ Pinecone upsert is working');
      console.log('\n👍 Safe to deploy to production!');
    } else {
      console.log('\n⚠️ Document did not complete successfully');
      console.log('Metadata:', JSON.stringify(updatedDoc?.metadata, null, 2));
    }
    
    // Cleanup
    console.log('\n5️⃣ Cleaning up test data...');
    await supabase.from('ingestion_jobs').delete().eq('id', job.id);
    await supabase.from('documents').delete().eq('id', doc.id);
    
    // Note: Pinecone vectors will remain (they're isolated by namespace)
    console.log('✅ Cleanup complete\n');
    
  } catch (error: any) {
    console.error('\n❌ PROCESSING FAILED:', error.message);
    console.error(error.stack);
    
    // Cleanup on error
    await supabase.from('ingestion_jobs').delete().eq('id', job.id);
    await supabase.from('documents').delete().eq('id', doc.id);
    
    console.log('\n🚫 DO NOT DEPLOY - Fix errors first!');
    process.exit(1);
  }
}

testUpload().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
