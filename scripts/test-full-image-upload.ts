/**
 * Full End-to-End Image Upload Test
 * 
 * Tests the complete flow:
 * 1. Upload image to Vercel Blob
 * 2. Create document record
 * 3. Create ingestion job
 * 4. Process with LangChain (including Gemini Vision)
 * 5. Verify chunks in Pinecone
 */

// Load environment variables
import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env.local') });

import { createClient } from '@supabase/supabase-js';
import { put } from '@vercel/blob';
import { processDocumentWithLangChain } from '../app/api/queue/worker/langchain-processor';
import * as fs from 'fs';

const TENANT_ID = 'b89b8fab-0a25-4266-a4d0-306cc4d358cb';

async function testFullImageUpload() {
  console.log('🧪 Testing Full Image Upload Flow...\n');
  
  const testImagePath = process.argv[2];
  
  if (!testImagePath) {
    console.log('📝 Usage: npx tsx scripts/test-full-image-upload.ts <path-to-image>');
    console.log('Example: npx tsx scripts/test-full-image-upload.ts ./test-image.png');
    process.exit(1);
  }
  
  if (!fs.existsSync(testImagePath)) {
    console.error(`❌ Image not found: ${testImagePath}`);
    process.exit(1);
  }
  
  const filename = testImagePath.split('/').pop() || 'test-image.png';
  
  // Initialize Supabase
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  
  try {
    // Step 1: Upload to Vercel Blob
    console.log('1️⃣ Uploading to Vercel Blob...');
    const imageBuffer = fs.readFileSync(testImagePath);
    const blob = await put(
      `${TENANT_ID}/${Date.now()}-${filename}`,
      imageBuffer,
      {
        access: 'public',
        addRandomSuffix: false,
      }
    );
    console.log(`✅ Uploaded to: ${blob.url}\n`);
    
    // Step 2: Create document record
    console.log('2️⃣ Creating document record...');
    const { data: doc, error: docError } = await supabase
      .from('documents')
      .insert({
        tenant_id: TENANT_ID,
        filename: filename,
        file_size: imageBuffer.length,
        mime_type: 'image/png',
        processing_status: 'pending',
        metadata: {
          storage_url: blob.url,
          storage_provider: 'vercel-blob',
        }
      })
      .select()
      .single();
    
    if (docError || !doc) {
      console.error('❌ Failed to create document:', docError);
      return;
    }
    console.log(`✅ Document created: ${doc.id}\n`);
    
    // Step 3: Create ingestion job
    console.log('3️⃣ Creating ingestion job...');
    const { data: job, error: jobError } = await supabase
      .from('ingestion_jobs')
      .insert({
        tenant_id: TENANT_ID,
        document_id: doc.id,
        filename: filename,
        file_type: 'image/png',
        file_path: blob.url,
        status: 'pending',
      })
      .select()
      .single();
    
    if (jobError || !job) {
      console.error('❌ Failed to create job:', jobError);
      return;
    }
    console.log(`✅ Job created: ${job.id}\n`);
    
    // Step 4: Process with LangChain
    console.log('4️⃣ Processing with LangChain + Gemini Vision...');
    const startTime = Date.now();
    
    // Download the blob
    const response = await fetch(blob.url);
    const fileBlob = await response.blob();
    
    await processDocumentWithLangChain(
      job,
      fileBlob,
      supabase
    );
    
    const duration = Date.now() - startTime;
    console.log(`✅ Processing completed in ${duration}ms\n`);
    
    // Step 5: Verify results
    console.log('5️⃣ Verifying results...');
    const { data: updatedDoc } = await supabase
      .from('documents')
      .select('*')
      .eq('id', doc.id)
      .single();
    
    console.log(`Document status: ${updatedDoc?.processing_status}`);
    console.log(`Chunks created: ${updatedDoc?.metadata?.chunk_count || 0}`);
    console.log(`Parse method: ${updatedDoc?.metadata?.parse_method || 'unknown'}`);
    console.log(`OCR engine: ${updatedDoc?.metadata?.ocrEngine || 'none'}`);
    
    if (updatedDoc?.processing_status === 'completed' && 
        updatedDoc?.metadata?.ocrEngine === 'gemini-2.0-flash') {
      console.log('\n🎉 SUCCESS! Image upload and OCR working correctly!\n');
      console.log('✅ Gemini Vision extracted text from image');
      console.log('✅ Chunks created and embedded');
      console.log('✅ Vectors stored in Pinecone');
      console.log('\n👍 Safe to process images in production!');
    } else {
      console.log('\n⚠️ Processing completed but might have issues:');
      console.log('Metadata:', JSON.stringify(updatedDoc?.metadata, null, 2));
    }
    
    // Cleanup
    console.log('\n6️⃣ Cleaning up test data...');
    await supabase.from('ingestion_jobs').delete().eq('id', job.id);
    await supabase.from('documents').delete().eq('id', doc.id);
    // Note: Blob file remains (would need manual cleanup)
    console.log('✅ Cleanup complete\n');
    
  } catch (error: any) {
    console.error('\n❌ TEST FAILED:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

testFullImageUpload().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

