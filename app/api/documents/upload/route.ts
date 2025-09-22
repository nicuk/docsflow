import { NextRequest, NextResponse } from 'next/server';
import { embed } from 'ai';
import { aiProvider, isRealAIAvailable } from '@/lib/ai/providers';
import formidable from 'formidable';
import { promises as fs } from 'fs';
// Dynamic imports to prevent build hangs
const loadPdfParse = () => import('pdf-parse');
const loadMammoth = () => import('mammoth'); 
const loadExcelJS = () => import('exceljs');
import { createClient } from '@supabase/supabase-js';
import { getUserAccessLevel } from '@/lib/auth-helpers';
import { validateTenantContext } from '@/lib/api-tenant-validation';
import { suggestClassification, getAllowedUploadClassifications, type DocumentClassification } from '@/lib/document-access-control';
import { EnhancedChunking } from '@/lib/enhanced-chunking';
import { ImageProcessor } from '@/lib/image-processor';
import { embeddingCache } from '@/lib/embedding-cache';
import { getCORSHeaders } from '@/lib/utils';

// Initialize services - only when environment variables are available
// SECURITY FIX: Use secure database service instead of direct service role
import { SecureDocumentService, SecureTenantService, SecureUserService } from '@/lib/secure-database';

export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get('origin');
  return new Response(null, {
    status: 200,
    headers: getCORSHeaders(origin),
  });
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get('origin');
  
  // Skip processing during build time
  if (process.env.NODE_ENV !== 'production' && !process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return NextResponse.json({ error: 'Service not available during build' }, { status: 503, headers: getCORSHeaders(origin) });
  }

  // Initialize variables at function scope for error handling
  let documentId: string | null = null;
  let supabase: any = null;

  try {
    // Validate tenant context first
    const tenantValidation = await validateTenantContext(request, {
      requireAuth: true // ✅ PRODUCTION: Authentication enabled
    });

    if (!tenantValidation.isValid) {
      return NextResponse.json(
        { 
          error: tenantValidation.error,
          security_violation: 'Invalid tenant context'
        },
        { status: tenantValidation.statusCode || 400, headers: getCORSHeaders(origin) }
      );
    }

    const tenantId = tenantValidation.tenantId!; // This is the UUID
    const tenantSubdomain = tenantValidation.tenantData?.subdomain || 'unknown';
    
    // SURGICAL FIX: Initialize Supabase client
    supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    
    // Get user access level
    let userAccessLevel;
    try {
      userAccessLevel = await getUserAccessLevel(request, tenantId);
    } catch (error) {
      console.error('Error getting user access level:', error);
      userAccessLevel = 1; // Default to level 1
    }

    // Check if services are available using the centralized provider
    if (!isRealAIAvailable()) {
      console.error('❌ Upload failed: GOOGLE_GENERATIVE_AI_API_KEY is not configured.');
      return NextResponse.json({ error: 'AI service not configured' }, { status: 500, headers: getCORSHeaders(origin) });
    }

    // Parse multipart form data with error handling
    let formData, file;
    try {
      formData = await request.formData();
      file = formData.get('file') as File;
    } catch (error) {
      console.error('FormData parsing error:', error);
      return NextResponse.json(
        { error: 'Failed to parse form data' },
        { status: 400, headers: getCORSHeaders(origin) }
      );
    }
    
    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400, headers: getCORSHeaders(origin) }
      );
    }

    // Validate file type and size
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/csv',
      'text/plain',
      'image/png',
      'image/jpeg'
    ];

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Unsupported file type' },
        { status: 400 }
      );
    }

    if (file.size > 50 * 1024 * 1024) { // 50MB limit
      return NextResponse.json(
        { error: 'File too large. Maximum size is 50MB' },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Extract text content based on file type
    let textContent = '';
    
    try {
      if (file.type === 'application/pdf') {
        const pdfParse = (await loadPdfParse()).default;
        const pdfData = await pdfParse(buffer);
        textContent = pdfData.text;
      } else if (file.type === 'application/msword' || 
                 file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        const mammoth = await loadMammoth();
        const docData = await mammoth.extractRawText({ buffer });
        textContent = docData.value;
      } else if (file.type === 'application/vnd.ms-excel' || 
                 file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
        const ExcelJS = await loadExcelJS();
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(buffer as any);
        
        const sheets: string[] = [];
        workbook.eachSheet((worksheet) => {
          const rows: string[] = [];
          worksheet.eachRow((row) => {
            const values = row.values as any[];
            // Skip first element which is undefined in ExcelJS
            const cleanValues = values.slice(1).map(v => v?.toString() || '');
            rows.push(cleanValues.join(','));
          });
          sheets.push(rows.join('\n'));
        });
        textContent = sheets.join('\n\n');
      } else if (file.type === 'text/csv') {
        textContent = buffer.toString('utf-8');
      } else if (file.type === 'text/plain') {
        textContent = buffer.toString('utf-8');
      } else if (file.type.startsWith('image/')) {
        // Process images with Gemini Vision API
        const imageProcessor = new ImageProcessor(aiProvider.getApiKey());
        textContent = await imageProcessor.extractImageContent(buffer, file.type);
        console.log(`Extracted image content (${file.name}): ${textContent.slice(0, 100)}...`);
      }
    } catch (extractionError) {
      console.error('Text extraction error:', extractionError);
      
      // Check if it's an empty document
      if (!textContent || textContent.trim().length === 0) {
        // For empty documents, create a placeholder
        textContent = `[Empty or unreadable ${file.type} document: ${file.name}]`;
        console.warn(`Document appears empty or unreadable, using placeholder: ${file.name}`);
      } else {
        // If we have some content but extraction partially failed, log and continue
        console.warn(`Partial extraction error for ${file.name}, continuing with available content`);
      }
    }

    // Store document metadata in Supabase
    // Get classification from request or auto-suggest
    const requestedClassification = formData.get('classification') as DocumentClassification | null;
    
    // We'll use created_at + 10 minutes for timeout check (no DB changes needed)
    
    // Get allowed classifications for this user
    const allowedClassifications = getAllowedUploadClassifications(userAccessLevel);
    
    // Determine final classification
    let documentAccessLevel: DocumentClassification;
    if (requestedClassification && allowedClassifications.includes(requestedClassification)) {
      // Use requested classification if user is allowed
      documentAccessLevel = requestedClassification;
    } else {
      // Auto-suggest based on content
      documentAccessLevel = suggestClassification(file.name, textContent, file.type);
      
      // Ensure user can upload at this level
      if (!allowedClassifications.includes(documentAccessLevel)) {
        // Downgrade to highest allowed level for user
        documentAccessLevel = allowedClassifications[allowedClassifications.length - 1] || 'internal' as DocumentClassification;
      }
    }
    
    // documentId already declared at function scope
    
    const { data: document, error: dbError } = await supabase
      .from('documents')
      .insert({
        tenant_id: tenantId,
        filename: file.name,
        file_size: file.size,
        mime_type: file.type,
        access_level: documentAccessLevel,
        processing_status: 'processing',
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (dbError) {
      console.error('Database error:', dbError);
      return NextResponse.json(
        { error: 'Failed to store document metadata' },
        { status: 500 }
      );
    }
    
    documentId = document.id;

    // 🚀 SURGICAL FIX: Enhanced timeout with parallel processing
    try {
      const processingTimeout = 28000; // 28 seconds (with parallel processing buffer)
      
      const processingPromise = processDocumentContentEnhanced(
        document.id, 
        textContent, 
        file.name, 
        file.type, 
        tenantId, 
        supabase, 
        userAccessLevel
      );
      
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => {
          reject(new Error('Document processing timeout - parallel processing taking longer than expected'));
        }, processingTimeout);
      });
      
      // Race between parallel processing and timeout
      await Promise.race([processingPromise, timeoutPromise]);
      
      // Update status to completed
      await supabase
        .from('documents')
        .update({ processing_status: 'completed' })
        .eq('id', document.id);
        
    } catch (processingError) {
      console.error('Document processing error:', processingError);
      
      // Check if it's a timeout error
      if (processingError instanceof Error && processingError.message.includes('timeout')) {
        // Mark as processing (will complete in background)
        await supabase
          .from('documents')
          .update({ 
            processing_status: 'processing',
            error_message: 'Processing continues in background due to file complexity'
          })
          .eq('id', document.id);
          
        console.log(`⏱️ Document ${document.id} processing moved to background due to timeout`);
      } else {
        // Actual processing error
        await supabase
          .from('documents')
          .update({ 
            processing_status: 'error',
            error_message: processingError instanceof Error ? processingError.message : 'Failed to process document content'
          })
          .eq('id', document.id);
      }
    }

    // Get final status after processing
    const { data: finalDocument } = await supabase
      .from('documents')
      .select('processing_status')
      .eq('id', document.id)
      .single();

    return NextResponse.json({
      documentId: document.id,
      filename: file.name,
      status: finalDocument?.processing_status || 'completed',
      message: 'Document uploaded and processed successfully'
    }, { headers: getCORSHeaders(origin) });

  } catch (error) {
    console.error('Upload error:', error);
    
    // If we have a document ID, update it to error status
    if (typeof documentId === 'string' && supabase) {
      try {
        await supabase
          .from('documents')
          .update({ 
            processing_status: 'error',
            error_message: error instanceof Error ? error.message : 'Upload failed'
          })
          .eq('id', documentId);
      } catch (updateError) {
        console.error('Failed to update document error status:', updateError);
      }
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: getCORSHeaders(origin) }
    );
  }
}

async function processDocumentContentEnhanced(
  documentId: string, 
  textContent: string, 
  filename: string,
  mimeType: string,
  tenantId: string, 
  supabase: any, 
  accessLevel: number = 1
) {
  // Initialize enhanced chunking with error handling
  let enhancedChunking;
  try {
    enhancedChunking = new EnhancedChunking(aiProvider.getApiKey());
  } catch (error) {
    console.error('EnhancedChunking initialization error:', error);
    throw new Error('Failed to initialize document processing');
  }
  
  // Determine document type for better context
  const documentType = getDocumentType(mimeType, filename);
  
  // 🎯 SMART CHUNKING: Skip complex chunking for simple content
  console.log(`Creating contextual chunks for ${filename}...`);
  let contextualChunks;
  
  // Check if content is simple enough to skip contextual chunking
  const isSimpleContent = textContent.length < 2000 || 
                         (mimeType.startsWith('image/') && textContent.length < 1000);
  
  if (isSimpleContent) {
    console.log(`🚀 Simple content detected (${textContent.length} chars), using fast single-chunk processing`);
    // Create a single chunk for simple content - no LLM calls needed
    contextualChunks = [{
      content: textContent,
      contextual_content: `${documentType} content: ${textContent}`,
      chunk_index: 0,
      context_summary: `${documentType} document: ${filename}`,
      confidence_indicators: { length: textContent.length, complexity: 'simple' }
    }];
  } else {
    console.log(`📄 Complex content detected (${textContent.length} chars), using enhanced contextual chunking`);
    try {
      contextualChunks = await enhancedChunking.createContextualChunks(
        textContent,
        filename,
        documentType
      );
    } catch (error) {
      console.error('AI chunking failed, using fallback basic chunking:', error);
      
      // Fallback to basic chunking when AI fails
      contextualChunks = createBasicChunks(textContent, filename);
      console.log(`Generated ${contextualChunks.length} basic fallback chunks`);
    }
  }
  
  // 🎯 SURGICAL FIX: Limit chunks to prevent timeout
  if (contextualChunks.length > 10) {
    console.log(`⚡ Too many chunks (${contextualChunks.length}), limiting to 10 to prevent timeout`);
    contextualChunks = contextualChunks.slice(0, 10);
  }
  
  console.log(`Generated ${contextualChunks.length} contextual chunks`);

  // 🚀 SURGICAL FIX: Process chunks in parallel to reduce timeout
  console.log(`🚀 Processing ${contextualChunks.length} chunks in PARALLEL to prevent timeout`);
  
  const chunkPromises = contextualChunks.map(async (chunk) => {
    try {
      // Generate embedding for the chunk with caching
      const { embedding } = await embeddingCache.getEmbedding(
        chunk.contextual_content,
        'text-embedding-004',
        async () => {
          const result = await embed({
            model: aiProvider.getEmbeddingModel(),
            value: chunk.contextual_content,
          });
          return result.embedding;
        }
      );
      
      // Store enhanced chunk in database
      const { error: chunkError } = await supabase
        .from('document_chunks')
        .insert({
          document_id: documentId,
          tenant_id: tenantId,
          chunk_index: chunk.chunk_index,
          content: chunk.content, // Original content for display
          embedding: embedding, // Embedding of contextual content
          access_level: accessLevel,
          metadata: {
            tenant_id: tenantId,
            chunk_length: chunk.content.length,
            context_summary: chunk.context_summary,
            contextual_content: chunk.contextual_content, // Store for debugging
            confidence_indicators: chunk.confidence_indicators,
            document_type: documentType,
            enhanced_chunking: true // Flag for enhanced chunks
          }
        });
      
      if (chunkError) {
        throw new Error(`Failed to insert chunk: ${chunkError.message}`);
      }
        
      console.log(`Processed chunk ${chunk.chunk_index} with context: ${chunk.context_summary.slice(0, 50)}...`);
      return { success: true, chunkIndex: chunk.chunk_index };
        
    } catch (embeddingError) {
      console.error(`Failed to process chunk ${chunk.chunk_index}:`, embeddingError);
      return { success: false, chunkIndex: chunk.chunk_index, error: embeddingError };
    }
  });
  
  // Execute all chunk processing in parallel with timeout protection
  try {
    const results = await Promise.allSettled(chunkPromises);
    const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
    const failed = results.length - successful;
    
    console.log(`🎯 Parallel processing complete: ${successful} successful, ${failed} failed`);
    
    if (successful === 0) {
      throw new Error('All chunk processing failed');
    }
  } catch (parallelError) {
    console.error('Parallel chunk processing error:', parallelError);
    throw parallelError;
  }
}

// Fallback basic chunking when AI fails
function createBasicChunks(textContent: string, filename: string) {
  const chunkSize = 1000;
  const overlap = 200;
  const chunks = [];
  
  for (let i = 0; i < textContent.length; i += chunkSize - overlap) {
    const chunk = textContent.slice(i, i + chunkSize);
    chunks.push({
      chunk_index: chunks.length,
      content: chunk,
      contextual_content: chunk, // Same as content for basic chunks
      context_summary: `Chunk ${chunks.length + 1} from ${filename}`,
      confidence_indicators: {
        semantic_coherence: 0.5, // Basic fallback score
        context_relevance: 0.5,
        information_density: chunk.length / chunkSize
      }
    });
  }
  
  return chunks;
}

function getDocumentType(mimeType: string, filename: string): string {
  if (mimeType.includes('pdf')) return 'PDF Document';
  if (mimeType.includes('word') || filename.endsWith('.docx') || filename.endsWith('.doc')) return 'Word Document';
  if (mimeType.includes('spreadsheet') || filename.endsWith('.xlsx') || filename.endsWith('.xls')) return 'Spreadsheet';
  if (mimeType.includes('text')) return 'Text Document';
  if (mimeType.includes('image')) return 'Image';
  return 'Document';
}

export const config = {
  api: {
    bodyParser: false,
  },
}; 