/**
 * Job Enqueue API Route
 * 
 * Creates a new ingestion job after file upload is complete.
 * Called by client after successfully uploading file to storage.
 * 
 * Flow:
 * 1. Client uploads file using presigned URL
 * 2. Client calls this endpoint to enqueue processing job
 * 3. Job is inserted into ingestion_jobs table
 * 4. Worker picks up job on next cron run
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { validateAuth } from '@/lib/auth-helpers';
import type { CreateJobRequest, CreateJobResponse } from '@/lib/queue';
import { JOB_STATUS } from '@/lib/queue';

// =====================================================
// POST /api/queue/enqueue
// =====================================================

export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate user and get tenant
    const { tenantId, userId } = await validateAuth(request);
    
    if (!tenantId || !userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // 2. Parse and validate request
    const body = await request.json() as CreateJobRequest;
    const { filename, file_size, file_path, file_type } = body;
    
    if (!filename || !file_size || !file_path || !file_type) {
      return NextResponse.json(
        { error: 'Missing required fields: filename, file_size, file_path, file_type' },
        { status: 400 }
      );
    }
    
    // 3. Verify file path belongs to this tenant (security check)
    if (!file_path.startsWith(`${tenantId}/`)) {
      return NextResponse.json(
        { error: 'Invalid file path' },
        { status: 403 }
      );
    }
    
    // 4. Create Supabase client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false
        }
      }
    );
    
    // 5. Verify file exists in storage
    const { data: fileExists, error: storageError } = await supabase.storage
      .from('documents')
      .list(tenantId, {
        search: file_path.split('/').pop() // Get filename from path
      });
    
    if (storageError || !fileExists || fileExists.length === 0) {
      return NextResponse.json(
        { error: 'File not found in storage. Upload may have failed.' },
        { status: 400 }
      );
    }
    
    // 6. Create document record (optional - job can create it during processing)
    // This gives us a document_id to track
    const { data: document, error: docError } = await supabase
      .from('documents')
      .insert({
        tenant_id: tenantId,
        filename: filename,
        file_type: file_type,
        file_size: file_size,
        processing_status: 'queued', // Will be updated by worker
        uploaded_by: userId,
        storage_path: file_path
      })
      .select()
      .single();
    
    if (docError) {
      // Continue anyway - worker can handle document creation
    }
    
    // 7. Insert job into queue
    const { data: job, error: jobError } = await supabase
      .from('ingestion_jobs')
      .insert({
        tenant_id: tenantId,
        document_id: document?.id || null,
        filename: filename,
        file_size: file_size,
        file_path: file_path,
        file_type: file_type,
        status: JOB_STATUS.PENDING,
        attempts: 0,
        max_attempts: 3,
        processing_metadata: {
          uploaded_by: userId,
          uploaded_at: new Date().toISOString()
        }
      })
      .select('id, status')
      .single();
    
    if (jobError) {
      return NextResponse.json(
        { error: 'Failed to create processing job', details: jobError.message },
        { status: 500 }
      );
    }
    
    // 8. Return success response
    const response: CreateJobResponse = {
      job_id: job.id,
      status: job.status
    };
    
    return NextResponse.json(response, { status: 201 });
    
  } catch (error) {
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// =====================================================
// GET /api/queue/enqueue (Get job status)
// =====================================================

export async function GET(request: NextRequest) {
  try {
    // 1. Authenticate
    const { tenantId } = await validateAuth(request);
    
    if (!tenantId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // 2. Get job_id from query params
    const searchParams = request.nextUrl.searchParams;
    const jobId = searchParams.get('job_id');
    
    if (!jobId) {
      return NextResponse.json(
        { error: 'Missing job_id parameter' },
        { status: 400 }
      );
    }
    
    // 3. Fetch job
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    
    const { data: job, error } = await supabase
      .from('ingestion_jobs')
      .select('*')
      .eq('id', jobId)
      .eq('tenant_id', tenantId) // Security: ensure job belongs to tenant
      .single();
    
    if (error || !job) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(job, { status: 200 });
    
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

