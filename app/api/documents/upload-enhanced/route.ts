/**
 * Enhanced Document Upload API with Multimodal Parsing
 * This is an example integration showing how to use the new multimodal parser
 * with proper feature flags and monitoring
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { validateTenantContext } from '@/lib/api-tenant-validation';
import { APP_URL } from '@/lib/constants';

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // Validate tenant context
    const validation = await validateTenantContext(request);
    if (!validation.isValid || !validation.tenantId) {
      return NextResponse.json(
        { error: 'Invalid tenant context' },
        { status: 401 }
      );
    }
    
    const { tenantId } = validation;
    
    // Parse request
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
    const ALLOWED_MIME_TYPES = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',       // .xlsx
      'application/vnd.openxmlformats-officedocument.presentationml.presentation', // .pptx
      'text/plain',
      'text/csv',
      'image/png',
      'image/jpeg',
      'image/webp',
    ];

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB.` },
        { status: 413 }
      );
    }

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: `File type not supported: ${file.type}` },
        { status: 415 }
      );
    }
    
    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    
    // Create Supabase client for storage upload
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    
    // 1. Upload file to storage
    const filePath = `${tenantId}/${Date.now()}-${file.name}`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('documents')
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: false
      });
    
    if (uploadError) {
      throw new Error(`Failed to upload file to storage: ${uploadError.message}`);
    }
    
    // 2. Create document record with "queued" status
    const { SecureDocumentService } = await import('@/lib/secure-database');
    
    const document = await SecureDocumentService.insertDocument({
      tenant_id: tenantId,
      filename: file.name,
      file_size: buffer.length,
      mime_type: file.type,
      processing_status: 'pending',
      processing_progress: 0,
      document_category: 'general',
      access_level: 'user_accessible',
      metadata: {
        tenant_id: tenantId,
        mime_type: file.type,
        storage_path: filePath,
        queued_at: new Date().toISOString()
      }
      // Removed: parse_method, has_tables, has_images (don't exist in schema)
    });
    
    if (!document) {
      throw new Error('Failed to create document record');
    }
    
    const documentId = (document as { id: string }).id;
    
    // 3. Create ingestion job for background processing
    const { data: job, error: jobError } = await supabase
      .from('ingestion_jobs')
      .insert({
        tenant_id: tenantId,
        document_id: documentId,
        filename: file.name,
        file_size: buffer.length,
        file_path: filePath,
        file_type: file.type,
        status: 'pending',
        attempts: 0,
        max_attempts: 3,
        processing_metadata: {
          use_multimodal: false,
          created_at: new Date().toISOString()
        }
      })
      .select()
      .single();
    
    if (jobError) {
      // Clean up if job creation fails
      await supabase.storage.from('documents').remove([filePath]);
      await supabase.from('documents').delete().eq('id', documentId);
      throw new Error(`Failed to create ingestion job: ${jobError.message}`);
    }
    
    const duration = Date.now() - startTime;
    
    // Return success response immediately (frontend-compatible format)
    return NextResponse.json({
      success: true,
      document: {
        id: documentId,
        filename: file.name,
        processing_status: 'queued',
        file_size: buffer.length,
        jobId: job.id,
        message: 'Document queued for processing. This may take 30s-2min depending on file size.'
      },
      metrics: {
        uploadTime: duration,
        method: 'async'
      }
    });
    
  } catch (error) {
    return NextResponse.json(
      { 
        error: 'Failed to upload document',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// OPTIONS handler for CORS
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': APP_URL,
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, x-tenant-id, x-tenant-subdomain',
    },
  });
}
