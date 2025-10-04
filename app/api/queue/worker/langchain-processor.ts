/**
 * LangChain-based Document Processing
 * 
 * Replaces 200+ lines of custom parsing/chunking with battle-tested LangChain components:
 * - RecursiveCharacterTextSplitter (smart chunking)
 * - OpenAIEmbeddings (automatic retry + batching)
 * - PineconeStore (optimized vector storage)
 */

import { createClient } from '@supabase/supabase-js';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { Document } from 'langchain/document';
import { Pinecone } from '@pinecone-database/pinecone';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

interface IngestionJob {
  id: string;
  tenant_id: string;
  document_id: string;
  filename: string;
  file_type: string | null;
  file_path: string;
  status: string;
  processing_metadata?: any;
}

export async function processDocumentWithLangChain(
  job: IngestionJob,
  fileData: Blob,
  supabase: ReturnType<typeof createClient>
): Promise<void> {
  console.log(`🚀 [JOB ${job.id}] Starting LangChain document processing`);
  console.log(`📄 [JOB ${job.id}] File: ${job.filename}, Type: ${job.file_type}`);
  
  let tempFilePath: string | null = null;
  
  try {
    // Convert blob to buffer
    const arrayBuffer = await fileData.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // Create temp file for LangChain loaders
    const tempDir = os.tmpdir();
    tempFilePath = path.join(tempDir, `upload_${job.id}_${job.filename}`);
    fs.writeFileSync(tempFilePath, buffer);
    console.log(`📦 [JOB ${job.id}] Temp file created`);
    
    // STEP 1: Load document with appropriate loader
    let docs: Document[];
    const mimeType = job.file_type || '';
    
    try {
      if (mimeType.includes('pdf')) {
        console.log(`📚 [JOB ${job.id}] Using PDFLoader`);
        const { PDFLoader } = await import('langchain/document_loaders/fs/pdf');
        const loader = new PDFLoader(tempFilePath);
        docs = await loader.load();
      } else if (mimeType.includes('word') || mimeType.includes('docx') || mimeType.includes('msword')) {
        console.log(`📄 [JOB ${job.id}] Using DocxLoader for DOCX`);
        const { DocxLoader } = await import('langchain/document_loaders/fs/docx');
        const loader = new DocxLoader(tempFilePath);
        docs = await loader.load();
      } else {
        console.log(`📝 [JOB ${job.id}] Using text extraction`);
        const textContent = buffer.toString('utf-8');
        docs = [new Document({ 
          pageContent: textContent,
          metadata: { source: job.filename, type: 'text' }
        })];
      }
      
      console.log(`✅ [JOB ${job.id}] Document loaded: ${docs.length} pages`);
    } catch (loadError) {
      console.error(`❌ [JOB ${job.id}] Loading failed, using text fallback:`, loadError);
      const textContent = buffer.toString('utf-8', 0, Math.min(buffer.length, 100000));
      docs = [new Document({ 
        pageContent: textContent,
        metadata: { source: job.filename, type: 'fallback' }
      })];
    }
    
    // STEP 2: Smart chunking with RecursiveCharacterTextSplitter
    console.log(`✂️ [JOB ${job.id}] Splitting documents (smart chunking)`);
    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200,
      separators: ['\n\n', '\n', '. ', ' ', ''], // Respect semantic boundaries
    });
    
    const chunks = await splitter.splitDocuments(docs);
    console.log(`✅ [JOB ${job.id}] Created ${chunks.length} chunks`);
    
    if (chunks.length === 0) {
      throw new Error('No chunks generated from document');
    }
    
    // Add metadata to chunks
    const enhancedChunks = chunks.map((chunk, index) => {
      return new Document({
        pageContent: chunk.pageContent,
        metadata: {
          ...chunk.metadata,
          documentId: job.document_id,
          tenantId: job.tenant_id,
          filename: job.filename,
          chunkIndex: index,
          totalChunks: chunks.length,
        }
      });
    });
    
    // Update progress
    await supabase
      .from('documents')
      .update({
        processing_status: 'processing',
        processing_progress: 50,
        metadata: {
          chunk_count: chunks.length,
          parse_method: 'langchain',
          processed_at: new Date().toISOString()
        }
      })
      .eq('id', job.document_id);
    
    // STEP 3: Generate embeddings with our custom OpenRouter-compatible function
    console.log(`🔗 [JOB ${job.id}] Generating embeddings via OpenRouter`);
    
    // Use our custom embeddings (OpenRouter-compatible)
    const { generateEmbeddings } = await import('@/lib/rag/core/embeddings');
    const texts = enhancedChunks.map(chunk => chunk.pageContent);
    const embeddingVectors = await generateEmbeddings(texts);
    
    console.log(`✅ [JOB ${job.id}] Generated ${embeddingVectors.length} embeddings`);
    
    // STEP 4: Upsert to Pinecone
    console.log(`💾 [JOB ${job.id}] Upserting to Pinecone`);
    
    const pinecone = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY!,
    });
    
    const pineconeIndex = pinecone.Index(process.env.PINECONE_INDEX!);
    
    // Prepare vectors with metadata (Pinecone only accepts simple values)
    const vectors = enhancedChunks.map((chunk, index) => {
      // Filter out complex objects from LangChain metadata
      const cleanMetadata: Record<string, string | number | boolean | string[]> = {};
      
      for (const [key, value] of Object.entries(chunk.metadata)) {
        // Only include simple values (string, number, boolean, string[])
        if (
          typeof value === 'string' ||
          typeof value === 'number' ||
          typeof value === 'boolean' ||
          (Array.isArray(value) && value.every(v => typeof v === 'string'))
        ) {
          cleanMetadata[key] = value;
        }
        // Skip complex objects like 'loc' which contains line number objects
      }
      
      return {
        id: `${job.document_id}_chunk_${index}`,
        values: embeddingVectors[index],
        metadata: {
          text: chunk.pageContent, // Content for retrieval
          ...cleanMetadata, // Only simple metadata values
        },
      };
    });
    
    // Upsert in batches
    const batchSize = 100;
    for (let i = 0; i < vectors.length; i += batchSize) {
      const batch = vectors.slice(i, i + batchSize);
      await pineconeIndex.namespace(job.tenant_id).upsert(batch);
    }
    
    console.log(`✅ [JOB ${job.id}] Upserted ${vectors.length} vectors to Pinecone`);
    
    console.log(`✅ [JOB ${job.id}] Pinecone ingestion complete:`);
    console.log(`   - Chunks processed: ${chunks.length}`);
    console.log(`   - Namespace: ${job.tenant_id}`);
    console.log(`   - Index: ${process.env.PINECONE_INDEX}`);
    
    // Update to completed
    await supabase
      .from('documents')
      .update({ 
        processing_status: 'completed',
        processing_progress: 100,
        metadata: {
          chunk_count: chunks.length,
          parse_method: 'langchain',
          processed_at: new Date().toISOString()
        }
      })
      .eq('id', job.document_id);
    
    console.log(`✅ [JOB ${job.id}] Successfully processed ${chunks.length} chunks`);
    
  } catch (error) {
    console.error(`❌ [JOB ${job.id}] LangChain ingestion failed:`, error);
    
    // Update status to error
    await supabase
      .from('documents')
      .update({
        processing_status: 'error',
        processing_progress: 100,
        metadata: {
          error: error instanceof Error ? error.message : 'Unknown error',
          failed_at: new Date().toISOString()
        }
      })
      .eq('id', job.document_id);
    
    throw error; // Will trigger retry logic
  } finally {
    // Cleanup temp file
    if (tempFilePath) {
      try {
        fs.unlinkSync(tempFilePath);
        console.log(`🗑️ [JOB ${job.id}] Temp file cleaned up`);
      } catch (cleanupError) {
        console.warn(`⚠️ [JOB ${job.id}] Temp file cleanup failed:`, cleanupError);
      }
    }
  }
}

