import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import formidable from 'formidable';
import { promises as fs } from 'fs';
import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';
import * as XLSX from 'xlsx';
import { createClient } from '@supabase/supabase-js';
import { getUserAccessLevel, extractTenantFromRequest } from '@/lib/auth-helpers';

// Initialize services - only when environment variables are available
const genAI = process.env.GOOGLE_AI_API_KEY ? new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY) : null;

function getSupabaseClient() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Supabase configuration not available');
  }
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

export async function POST(request: NextRequest) {
  // Skip processing during build time
  if (process.env.NODE_ENV !== 'production' && !process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return NextResponse.json({ error: 'Service not available during build' }, { status: 503 });
  }

  try {
    // Check if services are available
    if (!genAI) {
      return NextResponse.json({ error: 'AI service not configured' }, { status: 500 });
    }

    const supabase = getSupabaseClient();
    
    // Get tenant from subdomain and user access level
    const tenantId = extractTenantFromRequest(request);
    const userAccessLevel = await getUserAccessLevel(request, tenantId);

    // Parse multipart form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
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
        const pdfData = await pdfParse(buffer);
        textContent = pdfData.text;
      } else if (file.type === 'application/msword' || 
                 file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        const docData = await mammoth.extractRawText({ buffer });
        textContent = docData.value;
      } else if (file.type === 'application/vnd.ms-excel' || 
                 file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
        const workbook = XLSX.read(buffer, { type: 'buffer' });
        const sheetNames = workbook.SheetNames;
        textContent = sheetNames.map(name => {
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
    // Determine access level for the document (default to user's level, can be overridden)
    const documentAccessLevel = userAccessLevel; // Users can only upload at their access level or lower
    
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

    // Process document in background (chunk and embed)
    // For MVP, we'll do this synchronously, but in production this should be queued
    try {
      await processDocumentContent(document.id, textContent, tenantId, genAI, supabase, documentAccessLevel);
      
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
          error_message: 'Failed to process document content'
        })
        .eq('id', document.id);
    }

    return NextResponse.json({
      documentId: document.id,
      filename: file.name,
      status: 'processing',
      message: 'Document uploaded successfully and processing started'
    });

  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function processDocumentContent(documentId: string, textContent: string, tenantId: string, genAI: any, supabase: any, accessLevel: number = 1) {
  // Chunk the document content (simple implementation)
  const chunkSize = 1000; // characters
  const chunks = [];
  
  for (let i = 0; i < textContent.length; i += chunkSize) {
    chunks.push({
      content: textContent.slice(i, i + chunkSize),
      chunk_index: Math.floor(i / chunkSize)
    });
  }

  // Generate embeddings for each chunk using Google's embedding model
  const model = genAI.getGenerativeModel({ model: 'text-embedding-004' });
  
  for (const chunk of chunks) {
    try {
      // Generate embedding
      const result = await model.embedContent(chunk.content);
      const embedding = result.embedding;
      
      // Store chunk in database with embedding and access level
      await supabase
        .from('document_chunks')
        .insert({
          document_id: documentId,
          tenant_id: tenantId,
          chunk_index: chunk.chunk_index,
          content: chunk.content,
          embedding: embedding.values, // Store as JSONB array
          access_level: accessLevel,
          metadata: {
            tenant_id: tenantId,
            chunk_length: chunk.content.length
          }
        });
        
    } catch (embeddingError) {
      console.error(`Failed to process chunk ${chunk.chunk_index}:`, embeddingError);
      // Continue with other chunks even if one fails
    }
  }
}

export const config = {
  api: {
    bodyParser: false,
  },
}; 