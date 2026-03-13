/**
 * Job Retry API Route
 * 
 * Allows retrying failed jobs.
 * POST: Reset a failed job to pending status
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { validateAuth } from '@/lib/auth-helpers';
import { JOB_STATUS } from '@/lib/queue';

export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate
    const { tenantId } = await validateAuth(request);
    
    if (!tenantId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // 2. Parse request
    const { job_id } = await request.json();
    
    if (!job_id) {
      return NextResponse.json(
        { error: 'Missing job_id' },
        { status: 400 }
      );
    }
    
    // 3. Create Supabase client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    
    // 4. Verify job belongs to tenant and is failed
    const { data: job, error: fetchError } = await supabase
      .from('ingestion_jobs')
      .select('*')
      .eq('id', job_id)
      .eq('tenant_id', tenantId)
      .single();
    
    if (fetchError || !job) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      );
    }
    
    if (job.status !== JOB_STATUS.FAILED) {
      return NextResponse.json(
        { error: 'Only failed jobs can be retried' },
        { status: 400 }
      );
    }
    
    // 5. Reset job to pending
    const { error: updateError } = await supabase
      .from('ingestion_jobs')
      .update({
        status: JOB_STATUS.PENDING,
        attempts: 0, // Reset attempts
        next_retry_at: null,
        error_message: null,
        error_stack: null
      })
      .eq('id', job_id);
    
    if (updateError) {
      return NextResponse.json(
        { error: 'Failed to retry job' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ 
      success: true,
      message: 'Job queued for retry'
    });
    
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

