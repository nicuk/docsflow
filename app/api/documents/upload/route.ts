/**
 * Document Upload API - Simplified Queue-Based Upload
 * This endpoint queues documents for background processing
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { validateTenantContext } from '@/lib/api-tenant-validation';
import { put } from '@vercel/blob';

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

    console.log(`[Documents Upload] Queuing file for background processing: ${file.name}`);

    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Create Supabase client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    
    // 1. Upload file to Vercel Blob Storage (5-10x faster than Supabase!)
    const fileName = `${tenantId}/${Date.now()}-${file.name}`;
    const blob = await put(fileName, buffer, {
      access: 'public',
      contentType: file.type,
    });
    
    console.log(`[Documents Upload] File uploaded to Vercel Blob: ${blob.url}`);
    
    // Verify file is accessible (with retry for CDN propagation)
    console.log(`[Documents Upload] Verifying file accessibility...`);
    let fileAccessible = false;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const verifyResponse = await fetch(blob.url, { 
          method: 'HEAD',
          signal: AbortSignal.timeout(5000) // 5s timeout
        });
        if (verifyResponse.ok) {
          fileAccessible = true;
          console.log(`[Documents Upload] ✅ File verified accessible (attempt ${attempt})`);
          break;
        }
        console.log(`[Documents Upload] ⚠️ File not yet accessible: ${verifyResponse.status} (attempt ${attempt}/3)`);
      } catch (verifyError: any) {
        console.log(`[Documents Upload] ⚠️ Verification failed: ${verifyError.message} (attempt ${attempt}/3)`);
      }
      
      if (attempt < 3) {
        const waitTime = attempt * 2000; // 2s, 4s
        console.log(`[Documents Upload] Waiting ${waitTime}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
    
    if (!fileAccessible) {
      // File uploaded but not accessible - this is a critical issue
      console.error(`[Documents Upload] ❌ File uploaded but not accessible after 3 attempts: ${blob.url}`);
      throw new Error('File uploaded but failed accessibility verification. This may be a CDN or network issue.');
    }
    
    // 2. Create document record with "pending" status
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
        storage_url: blob.url, // Vercel Blob URL (replaces storage_path)
        storage_provider: 'vercel-blob',
        queued_at: new Date().toISOString()
      }
    });
    
    if (!document) {
      throw new Error('Failed to create document record');
    }
    
    const documentId = (document as any).id;
    
    if (!documentId) {
      console.error('[Documents Upload] Document record missing ID:', document);
      // Clean up blob on failure
      await fetch(blob.url, { method: 'DELETE' }).catch(() => {});
      throw new Error('Document record created but ID is missing');
    }
    
    console.log(`[Documents Upload] Document record created: ${documentId}`);
    
    // 3. Create ingestion job for background processing
    const { data: job, error: jobError } = await supabase
      .from('ingestion_jobs')
      .insert({
        tenant_id: tenantId,
        document_id: documentId,
        filename: file.name,
        file_size: buffer.length,
        file_path: blob.url, // Store Vercel Blob URL
        file_type: file.type,
        status: 'pending',
        attempts: 0,
        max_attempts: 3,
        processing_metadata: {
        created_at: new Date().toISOString()
        }
      })
      .select()
      .single();

    if (jobError) {
      // Clean up if job creation fails
      await fetch(blob.url, { method: 'DELETE' }).catch(() => {});
      await supabase.from('documents').delete().eq('id', documentId);
      throw new Error(`Failed to create ingestion job: ${jobError.message}`);
    }
    
    const duration = Date.now() - startTime;
    console.log(`[Documents Upload] Job created: ${job.id} in ${duration}ms`);
    
    // Return success response immediately (frontend-compatible format)
    return NextResponse.json({
      success: true,
      document: {
        id: documentId,
        filename: file.name,
        processing_status: 'pending',
        file_size: buffer.length,
        jobId: job.id,
        message: 'Document queued for processing. Processing will complete in 30s-2min.'
      },
      metrics: {
        uploadTime: duration,
        method: 'async'
      }
    });
    
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`[Documents Upload] Error after ${duration}ms:`, error);
    
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
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Tenant-ID, X-Tenant-Subdomain',
    },
  });
}

