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
import { traceable } from 'langsmith/traceable';
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

// Wrap the entire function with LangSmith tracing
export const processDocumentWithLangChain = traceable(
  async function processDocumentWithLangChain(
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
        console.log(`📄 [JOB ${job.id}] Processing DOCX with mammoth (faster + more reliable)`);
        
        try {
          // Use mammoth instead of DocxLoader (faster, more reliable)
          const mammoth = await import('mammoth');
          const result = await mammoth.extractRawText({ path: tempFilePath });
          
          if (!result.value || result.value.length < 10) {
            throw new Error('Mammoth returned empty or too-short content');
          }
          
          // Calculate document statistics
          const wordCount = result.value.split(/\s+/).filter(w => w.length > 0).length;
          const charCount = result.value.length;
          // Rough estimate: 250 words per page (standard formatting)
          const estimatedPages = Math.max(1, Math.ceil(wordCount / 250));
          
          console.log(`✅ [JOB ${job.id}] Mammoth extracted ${charCount} chars, ${wordCount} words, ~${estimatedPages} pages`);
          
          docs = [new Document({
            pageContent: result.value,
            metadata: { 
              source: job.filename, 
              type: 'docx',
              parser: 'mammoth',
              wordCount,
              charCount,
              estimatedPages,
              documentStats: `This document contains approximately ${estimatedPages} pages, ${wordCount} words, and ${charCount} characters.`,
            }
          })];
          
        } catch (docxError: any) {
          console.error(`❌ [JOB ${job.id}] DOCX parsing failed:`, docxError.message);
          throw new Error(`DOCX parsing failed: ${docxError.message}. File may be corrupted or password-protected.`);
        }
      } else if (mimeType.includes('image/')) {
        // 🖼️ IMAGE OCR - Use Gemini 2.0 Flash via OpenRouter
        console.log(`🖼️ [JOB ${job.id}] Processing image with Gemini 2.0 Flash Vision`);
        
        const base64Image = buffer.toString('base64');
        console.log(`📏 [JOB ${job.id}] Image base64 size: ${base64Image.length} chars`);
        
        // Use OpenRouter's Gemini 2.0 Flash for superior vision/OCR
        const visionPrompt = `Extract ALL text, numbers, and data from this image. Return ONLY the actual content visible in the image.

Rules:
- DO NOT add descriptions like "This image shows..." or "The document contains..."
- DO NOT add interpretations or summaries
- ONLY transcribe the exact text/data you see
- If there's a title, include it
- If there are bullet points, list them
- If there are tables/charts, extract the data
- If it's purely visual with no text, describe ONLY the key elements

Return raw content only.`;

        console.log(`🌐 [JOB ${job.id}] Calling OpenRouter Gemini Vision API (120s timeout)...`);
        const visionStartTime = Date.now();
        
        // Add 120s timeout to prevent hanging
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 120000); // 120 seconds
        
        try {
          const visionResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            signal: controller.signal,
            headers: {
              'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
              'Content-Type': 'application/json',
              'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'https://docsflow.app',
            },
            body: JSON.stringify({
              model: 'google/gemini-2.0-flash-001', // Gemini 2.0 with vision support
              messages: [{
                role: 'user',
                content: [
                  { type: 'text', text: visionPrompt },
                  { 
                    type: 'image_url', 
                    image_url: { 
                      url: `data:${job.file_type};base64,${base64Image}` 
                    } 
                  }
                ]
              }],
            }),
          });
          clearTimeout(timeout);
          
          const visionDuration = Date.now() - visionStartTime;
          console.log(`⏱️ [JOB ${job.id}] Vision API call took ${visionDuration}ms`);
        
          console.log(`📨 [JOB ${job.id}] Vision API response status: ${visionResponse.status}`);
          
          if (!visionResponse.ok) {
            const errorText = await visionResponse.text();
            console.error(`❌ [JOB ${job.id}] Vision API error: ${errorText}`);
            throw new Error(`Gemini Vision API failed (${visionResponse.status}): ${errorText}`);
          }
          
          const visionResult = await visionResponse.json();
          console.log(`✅ [JOB ${job.id}] Vision API call completed`);
          let extractedText = visionResult.choices?.[0]?.message?.content || '';
        
        if (!extractedText || extractedText.length < 10) {
          throw new Error('No text extracted from image - image may be blank or corrupted');
        }
        
        // 🔧 CLEAN OUTPUT FOR RAG:
        // Remove common LLM artifacts that slip through despite prompt
        extractedText = extractedText
          .replace(/^(Here is the|This image|The document|I can see|Extracted text:)\s*/gi, '') // Remove intro phrases
          .replace(/\*\*(.*?)\*\*/g, '$1') // Remove markdown bold
          .replace(/^[*•-]\s+/gm, '') // Clean up bullet points
          .trim();
        
        console.log(`✅ [JOB ${job.id}] Extracted ${extractedText.length} chars from image via Gemini 2.0 Flash`);
        
        // Create document from cleaned extracted text
        docs = [new Document({
          pageContent: extractedText,
          metadata: { 
            source: job.filename, 
            type: 'image_ocr',
            mimeType: job.file_type,
            ocrEngine: 'gemini-2.0-flash',
            originalLength: visionResult.choices?.[0]?.message?.content?.length || 0,
          }
        })];
        
      } catch (visionError: any) {
        clearTimeout(timeout);
        const duration = Date.now() - visionStartTime;
        
        if (visionError.name === 'AbortError') {
          console.error(`⏱️ [JOB ${job.id}] Vision API timeout after ${duration}ms`);
          throw new Error(`Gemini Vision API timed out after 120 seconds`);
        }
        throw visionError;
      }
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
      console.error(`❌ [JOB ${job.id}] Loading failed:`, loadError);
      
      // 🚨 DO NOT CREATE FALLBACK GARBAGE!
      // Binary files (DOCX, PDF, images) will create garbage if read as UTF-8
      // Better to fail the job and let user know the file is corrupted
      throw new Error(`Document loading failed: ${loadError instanceof Error ? loadError.message : 'Unknown error'}. File may be corrupted or in an unsupported format.`);
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
  },
  {
    name: 'processDocumentWithLangChain',
    run_type: 'chain',
  }
);

