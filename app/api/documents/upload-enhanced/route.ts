/**
 * Enhanced Document Upload API with Multimodal Parsing
 * This is an example integration showing how to use the new multimodal parser
 * with proper feature flags and monitoring
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { MultimodalDocumentParser } from '@/lib/rag-multimodal-parser';
import { isFeatureEnabled } from '@/lib/feature-flags';
import { trackParseOperation, trackTenantViolation } from '@/lib/rag-monitoring';
import { validateTenantContext } from '@/lib/api-tenant-validation';

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
    
    // 🚀 ASYNC PROCESSING: Queue the file for background processing
    console.log(`[Documents Upload] Queuing file for background processing: ${file.name}`);
    
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
    
    console.log(`[Documents Upload] File uploaded to storage: ${filePath}`);
    
    // 2. Create document record with "queued" status
    const { SecureDocumentService } = await import('@/lib/secure-database');
    
    const document = await SecureDocumentService.insertDocument({
      tenant_id: tenantId,
      filename: file.name, // ✅ This matches schema
      // ❌ REMOVED: content: '', (column doesn't exist)
      file_size: buffer.length, // ✅ This matches schema  
      mime_type: file.type, // ✅ This matches schema
      processing_status: 'pending', // ✅ This matches schema
      processing_progress: 0, // ✅ This matches schema
      document_category: 'general', // ✅ This matches schema
      access_level: 'user_accessible', // ✅ This matches schema
      metadata: {
        tenant_id: tenantId,
        mime_type: file.type,
        storage_path: filePath,
        queued_at: new Date().toISOString()
      }
      // ❌ REMOVED: parse_method, has_tables, has_images (don't exist)
    });
    
    if (!document) {
      throw new Error('Failed to create document record');
    }
    
    const documentId = (document as any).id;
    
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
          use_multimodal: isFeatureEnabled('MULTIMODAL_PARSING', tenantId),
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
    
    console.log(`[Documents Upload] Job created: ${job.id}`);
    
    // Track metrics
    const duration = Date.now() - startTime;
    trackParseOperation(
      tenantId,
      duration,
      true,
      'queued',
      file.type
    );
    
    // Return success response immediately (frontend-compatible format)
    return NextResponse.json({
      success: true,
      document: {
        id: documentId,
        filename: file.name, // 🎯 FIX: Match frontend expectation (not 'name')
        processing_status: 'queued', // 🎯 FIX: Match frontend expectation (not 'status')
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
    const duration = Date.now() - startTime;
    
    // Track error
    const tenantId = request.headers.get('x-tenant-id') || 'unknown';
    trackParseOperation(
      tenantId,
      duration,
      false,
      'basic',
      'unknown'
    );
    
    console.error('[Documents Upload] Error:', error);
    
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
      'Access-Control-Allow-Origin': 'https://docsflow.app',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, x-tenant-id, x-tenant-subdomain',
    },
  });
}
