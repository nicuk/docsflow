/**
 * COMPREHENSIVE TIMING TEST
 * Measures EXACTLY where time is spent in the upload pipeline
 * Run: npx tsx scripts/test-upload-timing.ts
 */

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

config({ path: '.env.local' });

// Alias for local testing
if (process.env.AI_GATEWAY_API_KEY && !process.env.OPENAI_API_KEY) {
  process.env.OPENAI_API_KEY = process.env.AI_GATEWAY_API_KEY;
}

async function testUploadTiming() {
  console.log('⏱️  COMPREHENSIVE UPLOAD TIMING TEST\n');
  console.log('Testing entire pipeline to find the bottleneck...\n');
  
  const testTenantId = 'b89b8fab-0a25-4266-a4d0-306cc4d358cb';
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  
  // Create a test DOCX file (small, ~1KB)
  const testContent = 'This is a test document. '.repeat(50); // ~1.2KB
  const testFilePath = path.join(process.cwd(), 'test-timing.txt');
  fs.writeFileSync(testFilePath, testContent);
  const fileSize = fs.statSync(testFilePath).size;
  
  console.log(`📄 Test file: ${fileSize} bytes (${(fileSize / 1024).toFixed(2)} KB)\n`);
  
  const timings: Record<string, number> = {};
  let documentId: string;
  let storagePath: string;
  
  try {
    // ============================================================
    // PHASE 1: UPLOAD TO SUPABASE STORAGE
    // ============================================================
    console.log('📤 PHASE 1: Upload to Supabase Storage');
    const uploadStart = Date.now();
    
    const buffer = fs.readFileSync(testFilePath);
    storagePath = `${testTenantId}/test-timing-${Date.now()}.txt`;
    
    const { error: uploadError } = await supabase.storage
      .from('documents')
      .upload(storagePath, buffer, {
        contentType: 'text/plain',
        upsert: false,
      });
    
    timings.upload = Date.now() - uploadStart;
    
    if (uploadError) {
      throw new Error(`Upload failed: ${uploadError.message}`);
    }
    
    console.log(`✅ Upload complete: ${timings.upload}ms\n`);
    
    // ============================================================
    // PHASE 2: CREATE DOCUMENT RECORD
    // ============================================================
    console.log('💾 PHASE 2: Create document record in DB');
    const dbStart = Date.now();
    
    const { data: document, error: docError} = await supabase
      .from('documents')
      .insert({
        tenant_id: testTenantId,
        filename: 'test-timing.txt',
        file_size: fileSize,
        mime_type: 'text/plain',
        processing_status: 'pending',
        metadata: { 
          storage_path: storagePath,
        },
      })
      .select()
      .single();
    
    timings.db_insert = Date.now() - dbStart;
    
    if (docError) {
      throw new Error(`DB insert failed: ${docError.message}`);
    }
    
    documentId = (document as any).id;
    console.log(`✅ DB insert complete: ${timings.db_insert}ms\n`);
    
    // ============================================================
    // PHASE 3: DOWNLOAD FROM SUPABASE STORAGE (THE SUSPECTED BOTTLENECK!)
    // ============================================================
    console.log('📥 PHASE 3: Download from Supabase Storage (SUSPECTED BOTTLENECK)');
    const downloadStart = Date.now();
    
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('documents')
      .download(storagePath);
    
    timings.download = Date.now() - downloadStart;
    
    if (downloadError || !fileData) {
      throw new Error(`Download failed: ${downloadError?.message || 'File not found'}`);
    }
    
    console.log(`✅ Download complete: ${timings.download}ms`);
    console.log(`   Downloaded: ${fileData.size} bytes\n`);
    
    // ============================================================
    // PHASE 4: CONVERT TO BUFFER
    // ============================================================
    console.log('🔄 PHASE 4: Convert Blob to Buffer');
    const bufferStart = Date.now();
    
    const arrayBuffer = await fileData.arrayBuffer();
    const downloadedBuffer = Buffer.from(arrayBuffer);
    
    timings.buffer_conversion = Date.now() - bufferStart;
    console.log(`✅ Buffer conversion: ${timings.buffer_conversion}ms\n`);
    
    // ============================================================
    // PHASE 5: LANGCHAIN PROCESSING (CHUNKING)
    // ============================================================
    console.log('✂️  PHASE 5: LangChain chunking');
    const chunkStart = Date.now();
    
    const { RecursiveCharacterTextSplitter } = await import('langchain/text_splitter');
    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200,
    });
    
    const { Document } = await import('langchain/document');
    const docs = [new Document({ 
      pageContent: downloadedBuffer.toString('utf-8'),
      metadata: { source: 'test-timing.txt' }
    })];
    
    const chunks = await splitter.splitDocuments(docs);
    
    timings.chunking = Date.now() - chunkStart;
    console.log(`✅ Chunking complete: ${timings.chunking}ms`);
    console.log(`   Created ${chunks.length} chunks\n`);
    
    // ============================================================
    // PHASE 6: EMBEDDINGS GENERATION
    // ============================================================
    console.log('🔗 PHASE 6: Generate embeddings via AI Gateway');
    const embeddingStart = Date.now();
    
    const { generateEmbeddings } = await import('../lib/rag/core/embeddings');
    const texts = chunks.map(chunk => chunk.pageContent);
    const embeddings = await generateEmbeddings(texts);
    
    timings.embeddings = Date.now() - embeddingStart;
    console.log(`✅ Embeddings complete: ${timings.embeddings}ms`);
    console.log(`   Generated ${embeddings.length} embeddings\n`);
    
    // ============================================================
    // PHASE 7: PINECONE UPSERT
    // ============================================================
    console.log('💾 PHASE 7: Upsert to Pinecone');
    const pineconeStart = Date.now();
    
    const { Pinecone } = await import('@pinecone-database/pinecone');
    const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY! });
    const index = pinecone.Index(process.env.PINECONE_INDEX!);
    
    const vectors = chunks.map((chunk, idx) => ({
      id: `${documentId}_chunk_${idx}`,
      values: embeddings[idx],
      metadata: {
        text: chunk.pageContent,
        filename: 'test-timing.txt',
        documentId,
        tenantId: testTenantId,
      },
    }));
    
    await index.namespace(testTenantId).upsert(vectors);
    
    timings.pinecone = Date.now() - pineconeStart;
    console.log(`✅ Pinecone upsert complete: ${timings.pinecone}ms\n`);
    
    // ============================================================
    // SUMMARY
    // ============================================================
    const totalTime = Object.values(timings).reduce((a, b) => a + b, 0);
    
    console.log('\n' + '='.repeat(60));
    console.log('📊 TIMING BREAKDOWN');
    console.log('='.repeat(60));
    
    const phases = [
      { name: 'Upload to Supabase Storage', time: timings.upload },
      { name: 'Create DB record', time: timings.db_insert },
      { name: '🚨 Download from Supabase', time: timings.download },
      { name: 'Buffer conversion', time: timings.buffer_conversion },
      { name: 'LangChain chunking', time: timings.chunking },
      { name: 'AI Gateway embeddings', time: timings.embeddings },
      { name: 'Pinecone upsert', time: timings.pinecone },
    ];
    
    phases.forEach((phase) => {
      const percentage = ((phase.time / totalTime) * 100).toFixed(1);
      const bar = '█'.repeat(Math.floor(Number(percentage) / 2));
      console.log(`\n${phase.name}:`);
      console.log(`  ${phase.time.toLocaleString()}ms (${percentage}%) ${bar}`);
    });
    
    console.log('\n' + '='.repeat(60));
    console.log(`🎯 TOTAL TIME: ${totalTime.toLocaleString()}ms (${(totalTime / 1000).toFixed(2)}s)`);
    console.log('='.repeat(60));
    
    // Find bottleneck
    const bottleneck = phases.reduce((max, phase) => 
      phase.time > max.time ? phase : max
    );
    
    console.log(`\n🔴 BOTTLENECK: ${bottleneck.name} (${bottleneck.time}ms)`);
    
    if (bottleneck.time > 5000) {
      console.log(`\n⚠️  WARNING: Bottleneck is SEVERE (>${(bottleneck.time / 1000).toFixed(1)}s)`);
      if (bottleneck.name.includes('Download')) {
        console.log(`\n💡 RECOMMENDATION: Migrate to Vercel Blob Storage`);
        console.log(`   - Faster downloads (same region as compute)`);
        console.log(`   - Native Vercel integration`);
        console.log(`   - No cross-service latency`);
      }
    } else {
      console.log(`\n✅ Performance is acceptable (<5s total)`);
    }
    
    // Cleanup
    console.log(`\n🗑️  Cleaning up test data...`);
    await supabase.from('documents').delete().eq('id', documentId);
    await supabase.storage.from('documents').remove([storagePath]);
    await index.namespace(testTenantId).deleteMany([
      ...vectors.map(v => v.id)
    ]);
    fs.unlinkSync(testFilePath);
    console.log(`✅ Cleanup complete`);
    
  } catch (error) {
    console.error('\n❌ TEST FAILED:', error);
    
    // Cleanup on error
    if (documentId!) {
      await supabase.from('documents').delete().eq('id', documentId);
    }
    if (storagePath!) {
      await supabase.storage.from('documents').remove([storagePath]);
    }
    if (fs.existsSync(testFilePath)) {
      fs.unlinkSync(testFilePath);
    }
    
    process.exit(1);
  }
}

testUploadTiming();

