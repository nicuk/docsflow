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

// Performance tracking helper
const timings: Record<string, number> = {};
function startTiming(label: string) {
  timings[`${label}_start`] = Date.now();
}
function endTiming(label: string): number {
  const duration = Date.now() - (timings[`${label}_start`] || 0);
  timings[label] = duration;
  return duration;
}

// Wrap the entire function with LangSmith tracing
export const processDocumentWithLangChain = traceable(
  async function processDocumentWithLangChain(
    job: IngestionJob,
    fileData: Blob,
    supabase: ReturnType<typeof createClient>
  ): Promise<void> {
  let tempFilePath: string | null = null;
  const totalStartTime = Date.now();
  
  try {
    const arrayBuffer = await fileData.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    const tempDir = os.tmpdir();
    tempFilePath = path.join(tempDir, `upload_${job.id}_${job.filename}`);
    fs.writeFileSync(tempFilePath, buffer);
    
    let docs: Document[];
    const mimeType = job.file_type || '';
    
    try {
      if (mimeType.includes('pdf')) {
        const { PDFLoader } = await import('@langchain/community/document_loaders/fs/pdf');
        const loader = new PDFLoader(tempFilePath);
        docs = await loader.load();
      } else if (mimeType.includes('word') || mimeType.includes('docx') || mimeType.includes('msword')) {
        try {
          // Use mammoth with buffer (faster - no disk I/O on Vercel serverless)
          const mammoth = await import('mammoth');
          const result = await mammoth.extractRawText({ buffer });
          
          if (!result.value || result.value.length < 10) {
            throw new Error('Mammoth returned empty or too-short content');
          }
          
          // Calculate document statistics
          const wordCount = result.value.split(/\s+/).filter(w => w.length > 0).length;
          const charCount = result.value.length;
          // Rough estimate: 250 words per page (standard formatting)
          const estimatedPages = Math.max(1, Math.ceil(wordCount / 250));
          
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
          console.error(`[JOB ${job.id}] DOCX parsing failed:`, docxError.message);
          throw new Error(`DOCX parsing failed: ${docxError.message}. File may be corrupted or password-protected.`);
        }
      } else if (mimeType.includes('image/')) {
        const base64Image = buffer.toString('base64');
        
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
          
          if (!visionResponse.ok) {
            const errorText = await visionResponse.text();
            console.error(`[JOB ${job.id}] Vision API error: ${errorText}`);
            throw new Error(`Gemini Vision API failed (${visionResponse.status}): ${errorText}`);
          }
          
          const visionResult = await visionResponse.json();
          let extractedText = visionResult.choices?.[0]?.message?.content || '';
        
        if (!extractedText || extractedText.length < 10) {
          throw new Error('No text extracted from image - image may be blank or corrupted');
        }
        
        // Clean output for RAG:
        // Remove common LLM artifacts that slip through despite prompt
        extractedText = extractedText
          .replace(/^(Here is the|This image|The document|I can see|Extracted text:)\s*/gi, '') // Remove intro phrases
          .replace(/\*\*(.*?)\*\*/g, '$1') // Remove markdown bold
          .replace(/^[*•-]\s+/gm, '') // Clean up bullet points
          .trim();
        
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
          throw new Error(`Gemini Vision API timed out after 120 seconds`);
        }
        throw visionError;
      }
      } else {
        const textContent = buffer.toString('utf-8');
        docs = [new Document({ 
          pageContent: textContent,
          metadata: { source: job.filename, type: 'text' }
        })];
      }
      
    } catch (loadError) {
      console.error(`[JOB ${job.id}] Loading failed:`, loadError);
      
      // Do not create fallback garbage!
      // Binary files (DOCX, PDF, images) will create garbage if read as UTF-8
      // Better to fail the job and let user know the file is corrupted
      throw new Error(`Document loading failed: ${loadError instanceof Error ? loadError.message : 'Unknown error'}. File may be corrupted or in an unsupported format.`);
    }
    
    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200,
      separators: ['\n\n', '\n', '. ', ' ', ''], // Respect semantic boundaries
    });
    
    const chunks = await splitter.splitDocuments(docs);
    
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
    
    // Generate document summary for hierarchical retrieval
    try {
      const { generateDocumentSummary } = await import('@/lib/rag/core/summarization');
      
      // Combine all chunk content to get full document text
      const fullText = enhancedChunks.map(c => c.pageContent).join('\n\n');
      const wordCount = fullText.split(/\s+/).length;
      
      const summary = await generateDocumentSummary({
        text: fullText,
        filename: job.filename,
        wordCount,
        mimeType: job.file_type,
      });
      
      // Save summary to database
      const { error: updateError } = await supabase
        .from('documents')
        .update({
          summary,
          summary_generated_at: new Date().toISOString(),
        })
        .eq('id', job.document_id);
      
      if (updateError) {
        console.error(`[JOB ${job.id}] Failed to save summary:`, updateError);
      }
    } catch (summaryError) {
      // Non-critical error - don't fail the job
      console.error(`[JOB ${job.id}] Summary generation failed (non-critical):`, summaryError);
    }
    
    // Use our custom embeddings (OpenRouter-compatible)
    const { generateEmbeddings } = await import('@/lib/rag/core/embeddings');
    const { generateWeightedSparseVector } = await import('@/lib/rag/core/sparse-vectors');
    
    const texts = enhancedChunks.map(chunk => chunk.pageContent);
    const embeddingVectors = await generateEmbeddings(texts);
    
    // Generate sparse vectors for HYBRID SEARCH
    
    const sparseVectors = enhancedChunks.map((chunk) => {
      // Weight filename 3x more than content for better filename matching
      return generateWeightedSparseVector([
        { text: chunk.metadata.filename || '', weight: 3.0 },
        { text: chunk.pageContent, weight: 1.0 },
      ]);
    });
    
    // Upsert to Pinecone
    
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
        values: embeddingVectors[index], // Dense vector (semantic)
        sparseValues: sparseVectors[index], // Sparse vector (keyword) - HYBRID SEARCH
        metadata: {
          text: chunk.pageContent, // Content for retrieval
          ...cleanMetadata, // Only simple metadata values
        },
      };
    });
    
    // Upsert in batches with timeout protection (60s per batch = matches Vercel limit)
    const batchSize = 100;
    const BATCH_TIMEOUT = 60000; // 60 seconds per batch (2x previous timeout for images)
    const MAX_RETRIES = 2;
    
    for (let i = 0; i < vectors.length; i += batchSize) {
      const batch = vectors.slice(i, i + batchSize);
      const batchNum = Math.floor(i/batchSize) + 1;
      const totalBatches = Math.ceil(vectors.length/batchSize);
      
      
      
      // Retry logic for individual batch failures
      let retries = 0;
      let batchSuccess = false;
      
      while (retries <= MAX_RETRIES && !batchSuccess) {
        try {
          const upsertPromise = pineconeIndex.namespace(job.tenant_id).upsert(batch);
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error(`Pinecone batch ${batchNum} timeout (${BATCH_TIMEOUT/1000}s)`)), BATCH_TIMEOUT)
          );
          
          await Promise.race([upsertPromise, timeoutPromise]);
          batchSuccess = true;
        } catch (batchError: any) {
          retries++;
          if (retries <= MAX_RETRIES) {
            await new Promise(resolve => setTimeout(resolve, 2000));
          } else {
            throw new Error(`Pinecone batch ${batchNum}/${totalBatches} failed: ${batchError.message}`);
          }
        }
      }
    }
    
    // Document status update is handled by route.ts after this function returns
    
  } catch (error) {
    console.error(`[JOB ${job.id}] LangChain ingestion failed:`, error);
    throw error; // Will trigger retry logic in route.ts
  } finally {
    // Cleanup temp file
    if (tempFilePath) {
      try {
        fs.unlinkSync(tempFilePath);
      } catch (cleanupError) {
        // Non-critical: temp file cleanup failed
      }
    }
  }
  },
  {
    name: 'processDocumentWithLangChain',
    run_type: 'chain',
  }
);

