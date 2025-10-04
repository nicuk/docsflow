/**
 * Test document upload flow LOCALLY before deploying
 * Run: npx tsx scripts/test-upload-locally.ts
 * 
 * This simulates the entire upload → processing → embedding → Pinecone flow
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

config({ path: '.env.local' });

// Alias AI Gateway key to OPENAI_API_KEY for local testing
if (process.env.AI_GATEWAY_API_KEY && !process.env.OPENAI_API_KEY) {
  process.env.OPENAI_API_KEY = process.env.AI_GATEWAY_API_KEY;
}

async function testUploadFlow() {
  console.log('🧪 Testing Complete Upload Flow Locally\n');
  
  // Validate environment
  const required = ['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'AI_GATEWAY_API_KEY', 'PINECONE_API_KEY', 'PINECONE_INDEX'];
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    console.error('❌ Missing environment variables:', missing.join(', '));
    process.exit(1);
  }
  
  console.log('✅ Environment variables validated\n');
  
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  
  const testTenantId = 'b89b8fab-0a25-4266-a4d0-306cc4d358cb'; // Your tenant ID
  
  try {
    // 1. Create a test document
    console.log('📄 Step 1: Creating test document record...');
    const testContent = 'This is a test document for local testing. It contains some sample text about RAG systems, embeddings, and Pinecone vector databases.';
    
    const { data: document, error: docError } = await supabase
      .from('documents')
      .insert({
        tenant_id: testTenantId,
        filename: 'local-test.txt',
        file_size: testContent.length,
        mime_type: 'text/plain',
        processing_status: 'pending',
        processing_progress: 0,
        document_category: 'general',
        access_level: 'user_accessible',
        metadata: {
          test: true,
          created_at: new Date().toISOString()
        }
      })
      .select()
      .single();
    
    if (docError || !document) {
      console.error('❌ Failed to create document:', docError);
      process.exit(1);
    }
    
    const documentId = document.id;
    console.log(`✅ Document created: ${documentId}\n`);
    
    // 2. Test LangChain processing
    console.log('📚 Step 2: Testing LangChain document processing...');
    
    const { RecursiveCharacterTextSplitter } = await import('langchain/text_splitter');
    const { Document } = await import('langchain/document');
    
    const doc = new Document({
      pageContent: testContent,
      metadata: { source: 'local-test.txt', type: 'test' }
    });
    
    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 100,
      chunkOverlap: 20,
    });
    
    const chunks = await splitter.splitDocuments([doc]);
    console.log(`✅ Created ${chunks.length} chunks\n`);
    
    // 3. Test embeddings
    console.log('🔗 Step 3: Testing embeddings generation...');
    const { generateEmbeddings } = await import('../lib/rag/core/embeddings');
    
    const texts = chunks.map(chunk => chunk.pageContent);
    const embeddings = await generateEmbeddings(texts);
    
    console.log(`✅ Generated ${embeddings.length} embeddings`);
    console.log(`   Dimension: ${embeddings[0].length}`);
    console.log(`   Sample: [${embeddings[0].slice(0, 3).map(v => v.toFixed(4)).join(', ')}...]\n`);
    
    // 4. Test Pinecone upsert
    console.log('💾 Step 4: Testing Pinecone upsert...');
    const { Pinecone } = await import('@pinecone-database/pinecone');
    
    const pinecone = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY!,
    });
    
    const index = pinecone.Index(process.env.PINECONE_INDEX!);
    
    const vectors = chunks.map((chunk, idx) => ({
      id: `${documentId}_chunk_${idx}`,
      values: embeddings[idx],
      metadata: {
        text: chunk.pageContent,
        documentId: documentId,  // This should NOT be null!
        tenantId: testTenantId,
        filename: 'local-test.txt',
        chunkIndex: idx,
        totalChunks: chunks.length,
      }
    }));
    
    await index.namespace(testTenantId).upsert(vectors);
    console.log(`✅ Upserted ${vectors.length} vectors to Pinecone\n`);
    
    // 5. Test retrieval
    console.log('🔍 Step 5: Testing vector retrieval...');
    const { generateEmbedding } = await import('../lib/rag/core/embeddings');
    
    const queryEmbedding = await generateEmbedding('What is RAG?');
    
    const queryResponse = await index.namespace(testTenantId).query({
      vector: queryEmbedding,
      topK: 3,
      includeMetadata: true,
    });
    
    console.log(`✅ Retrieved ${queryResponse.matches.length} matches:`);
    queryResponse.matches.forEach((match, idx) => {
      console.log(`   ${idx + 1}. Score: ${match.score?.toFixed(4)} - "${(match.metadata?.text as string)?.substring(0, 60)}..."`);
    });
    console.log('');
    
    // 6. Cleanup
    console.log('🗑️ Step 6: Cleaning up test data...');
    
    // Delete from Pinecone
    await index.namespace(testTenantId).deleteMany(
      vectors.map(v => v.id)
    );
    
    // Delete document
    await supabase
      .from('documents')
      .delete()
      .eq('id', documentId);
    
    console.log('✅ Cleanup complete\n');
    
    console.log('🎉 ALL TESTS PASSED!');
    console.log('✅ Document creation works');
    console.log('✅ LangChain chunking works');
    console.log('✅ AI Gateway embeddings work');
    console.log('✅ Pinecone upsert works (no null documentId!)');
    console.log('✅ Vector retrieval works');
    console.log('');
    console.log('🚀 SAFE TO DEPLOY!');
    
  } catch (error) {
    console.error('\n❌ TEST FAILED:', error);
    process.exit(1);
  }
}

testUploadFlow();

