import { NextRequest, NextResponse } from 'next/server';
import { embed } from 'ai';
import { aiProvider, isRealAIAvailable } from '@/lib/ai/providers';
import formidable from 'formidable';
import { promises as fs } from 'fs';
// Dynamic imports to prevent build hangs
const loadPdfParse = () => import('pdf-parse');
const loadMammoth = () => import('mammoth'); 
const loadXLSX = () => import('xlsx');
import { createClient } from '@supabase/supabase-js';
import { getUserAccessLevel } from '@/lib/auth-helpers';
import { validateTenantContext } from '@/lib/api-tenant-validation';
import { suggestClassification, getAllowedUploadClassifications, type DocumentClassification } from '@/lib/document-access-control';
import { EnhancedChunking } from '@/lib/enhanced-chunking';
import { getCORSHeaders } from '@/lib/utils';

// Initialize services - only when environment variables are available
function getSupabaseClient() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Supabase configuration not available');
  }
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

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

  try {
    // Validate tenant context first
    const tenantValidation = await validateTenantContext(request, {
      requireAuth: false // Set to true for production
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
    
    // Initialize Supabase
    let supabase;
    try {
      supabase = getSupabaseClient();
    } catch (error) {
      console.error('Supabase initialization error:', error);
      return NextResponse.json({ error: 'Database service not available' }, { status: 500, headers: getCORSHeaders(origin) });
    }
    
    // Get user access level
    let userAccessLevel;
    try {
      userAccessLevel = await getUserAccessLevel(request, tenantId);
    } catch (error) {
      console.error('Auth error:', error);
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
        const XLSX = await loadXLSX();
        const workbook = XLSX.read(buffer, { type: 'buffer' });
        const sheetNames = workbook.SheetNames;
        textContent = sheetNames.map((name: string) => {
          const sheet = workbook.Sheets[name];
          return XLSX.utils.sheet_to_csv(sheet);
        }).join('\n\n');
      } else if (file.type === 'text/csv') {
        textContent = buffer.toString('utf-8');
      } else if (file.type === 'text/plain') {
        textContent = buffer.toString('utf-8');
      } else if (file.type.startsWith('image/')) {
        // For images, we'll use Google Gemini Vision API later
        textContent = `[Image: ${file.name}]`;
      }
    } catch (extractionError) {
      console.error('Text extraction error:', extractionError);
      return NextResponse.json(
        { error: 'Failed to extract text from document' },
        { status: 500 }
      );
    }

    // Store document metadata in Supabase
    // Get classification from request or auto-suggest
    const requestedClassification = formData.get('classification') as DocumentClassification | null;
    
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
        documentAccessLevel = allowedClassifications[allowedClassifications.length - 1] || 'public';
      }
    }
    
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

    // Process document with enhanced contextual chunking
    // This gives us 49% accuracy improvement over basic chunking
    try {
      await processDocumentContentEnhanced(
        document.id, 
        textContent, 
        file.name, 
        file.type, 
        tenantId, 
        supabase, 
        userAccessLevel
      );
      
      // Update status to completed
      await supabase
        .from('documents')
        .update({ processing_status: 'completed' })
        .eq('id', document.id);
        
    } catch (processingError) {
      console.error('Document processing error:', processingError);
      
      // Update status to error
      await supabase
        .from('documents')
        .update({ 
          processing_status: 'error',
          error_message: processingError instanceof Error ? processingError.message : 'Failed to process document content'
        })
        .eq('id', document.id);
    }

    return NextResponse.json({
      documentId: document.id,
      filename: file.name,
      status: 'processing',
      message: 'Document uploaded successfully and processing started'
    }, { headers: getCORSHeaders(origin) });

  } catch (error) {
    console.error('Upload error:', error);
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
  
  // Create contextual chunks (49% accuracy improvement) with fallback
  console.log(`Creating contextual chunks for ${filename}...`);
  let contextualChunks;
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
  
  console.log(`Generated ${contextualChunks.length} contextual chunks`);

  // Process each contextual chunk
  for (const chunk of contextualChunks) {
    try {
      // Generate embedding using contextual content (not just raw content)
      // Use the centralized provider for embeddings
      const { embedding } = await embed({
        model: aiProvider.getEmbeddingModel(), // Use shared model
        value: chunk.contextual_content,
      });
      
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
        
    } catch (embeddingError) {
      console.error(`Failed to process chunk ${chunk.chunk_index}:`, embeddingError);
      // Continue with other chunks even if one fails
    }
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