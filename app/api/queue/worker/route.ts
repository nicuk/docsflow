/**
 * Worker API Route
 * 
 * Processes queued ingestion jobs with concurrency control.
 * Called by Vercel Cron every minute.
 * 
 * Features:
 * - Atomic job locking (FOR UPDATE SKIP LOCKED)
 * - Global and per-tenant concurrency limits
 * - Stale job cleanup
 * - Exponential backoff retry logic
 * - Comprehensive error handling
 * 
 * Security:
 * - Only callable by Vercel Cron (validates CRON_SECRET)
 * - Uses service role for database access
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { IngestionJob, WorkerProcessResult } from '@/lib/queue';
import { 
  DEFAULT_WORKER_CONFIG,
  JOB_STATUS,
  calculateNextRetry,
  formatJobError,
  shouldRetry
} from '@/lib/queue';

// =====================================================
// CONFIGURATION
// =====================================================

const WORKER_CONFIG = {
  ...DEFAULT_WORKER_CONFIG,
  // Override defaults if needed via environment variables
  global_max_concurrent: parseInt(process.env.WORKER_GLOBAL_MAX || '10'),
  per_tenant_max_concurrent: parseInt(process.env.WORKER_PER_TENANT_MAX || '2'),
  stale_job_timeout_minutes: parseInt(process.env.WORKER_STALE_TIMEOUT || '5')
};

// =====================================================
// POST /api/queue/worker
// =====================================================

// Main worker function (shared by POST and GET)
async function processWorkerRequest(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // 1. Verify this is a legitimate cron request
    const authHeader = request.headers.get('Authorization');
    const expectedAuth = `Bearer ${process.env.CRON_SECRET}`;
    
    if (!authHeader || authHeader !== expectedAuth) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    
    
    // 2. Create Supabase client with service role
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
    
    // 3. Reset stale jobs (stuck in "processing" state)
    const { data: resetCount } = await supabase
      .rpc('reset_stale_jobs', { 
        p_timeout_minutes: WORKER_CONFIG.stale_job_timeout_minutes 
      });
    
    
    
    // 4. Atomically fetch pending jobs (with lock)
    // Filter out jobs created in the last 60s (CDN propagation time for Vercel Blob)
    const { data: jobs, error: fetchError } = await supabase
      .rpc('get_pending_jobs', {
        p_max_jobs: WORKER_CONFIG.global_max_concurrent
      }) as { data: IngestionJob[] | null, error: any };
    
    if (fetchError) {
      return NextResponse.json(
        { error: 'Failed to fetch jobs', details: fetchError.message },
        { status: 500 }
      );
    }
    
    if (!jobs || jobs.length === 0) {
      return NextResponse.json({
        message: 'No jobs to process',
        processed: 0,
        jobs: [],
        duration_ms: Date.now() - startTime
      });
    }
    
    
    
    // 5. Process jobs with per-tenant concurrency control
    const processedJobIds: string[] = [];
    const tenantJobCounts = new Map<string, number>();
    
    for (const job of jobs) {
      try {
        // Check per-tenant concurrency limit
        const { count: processingCount } = await supabase
          .from('ingestion_jobs')
          .select('*', { count: 'exact', head: true })
          .eq('tenant_id', job.tenant_id)
          .eq('status', JOB_STATUS.PROCESSING);
        
        const currentCount = processingCount || 0;
        const pendingCount = tenantJobCounts.get(job.tenant_id) || 0;
        const totalCount = currentCount + pendingCount;
        
        if (totalCount >= WORKER_CONFIG.per_tenant_max_concurrent) {
          continue;
        }
        
        // Mark job as processing
        const { error: updateError } = await supabase
          .from('ingestion_jobs')
          .update({
            status: JOB_STATUS.PROCESSING,
            started_at: new Date().toISOString()
          })
          .eq('id', job.id)
          .eq('status', JOB_STATUS.PENDING); // Double-check still pending
        
        if (updateError) {
          continue;
        }
        
        // Track tenant job count
        tenantJobCounts.set(job.tenant_id, (tenantJobCounts.get(job.tenant_id) || 0) + 1);
        
        // Process job asynchronously (fire and forget)
        processJob(job, supabase).catch((_) => {
          /* error already handled in processJob via handleJobFailure */
        });
        
        processedJobIds.push(job.id);
        
      } catch (_error) {
        console.error('Job processing iteration error:', _error);
      }
    }
    
    // 6. Return processing summary
    const result: WorkerProcessResult = {
      processed: processedJobIds.length,
      jobs: processedJobIds
    };
    
    const duration = Date.now() - startTime;
    
    return NextResponse.json({
      ...result,
      duration_ms: duration,
      tenant_stats: Object.fromEntries(tenantJobCounts)
    });
    
  } catch (error) {
    return NextResponse.json(
      { 
        error: 'Worker error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Export POST and GET handlers (Vercel Cron uses GET)
export async function POST(request: NextRequest) {
  return processWorkerRequest(request);
}

export async function GET(request: NextRequest) {
  // Check if this is a cron request (has auth header) or health check (no auth)
  const authHeader = request.headers.get('Authorization');
  
  if (authHeader) {
    return processWorkerRequest(request);
  } else {
    try {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );
      
      const { data: stats } = await supabase
        .rpc('get_job_stats', { p_tenant_id: '00000000-0000-0000-0000-000000000000' });
      
      return NextResponse.json({
        status: 'healthy',
        worker_config: WORKER_CONFIG,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      return NextResponse.json(
        { status: 'unhealthy', error: 'Database connection failed' },
        { status: 503 }
      );
    }
  }
}

// =====================================================
// JOB PROCESSING LOGIC
// =====================================================

async function processJob(
  job: IngestionJob,
  supabase: any
): Promise<void> {
  const jobStartTime = Date.now();
  
  try {
    
    
    // 1. Get file data (either from embedded data or download from Blob)
    let fileData: Blob | null = null;
    
    // Check if file data is embedded in job metadata (avoids CDN propagation issues)
    const metadata = job.processing_metadata as any;
    if (metadata?.direct_processing && metadata?.file_data_base64) {
      try {
        const buffer = Buffer.from(metadata.file_data_base64, 'base64');
        fileData = new Blob([buffer]);
      } catch (_) {
        /* expected when base64 decode fails; fall through to download from Blob */
      }
    }
    
    // If no embedded data, download from Vercel Blob Storage
    if (!fileData) {
      const downloadStart = Date.now();
      
      let lastError: Error | null = null;
      const maxRetries = 3;
      const timeoutMs = 10000; // 10 second timeout (21KB file should download in <1s)
      
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          const headResponse = await fetch(job.file_path, {
            method: 'HEAD',
            signal: AbortSignal.timeout(5000) // 5s timeout for HEAD
          });
          
          if (!headResponse.ok) {
            throw new Error(`File not accessible (${headResponse.status}): ${headResponse.statusText}`);
          }
          
          const downloadStartTime = Date.now();
          
          // Use Promise.race for more reliable timeout (AbortSignal.timeout sometimes doesn't work)
          const downloadPromise = (async () => {
            const response = await fetch(job.file_path);
            
            if (!response.ok) {
              throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const arrayBuffer = await response.arrayBuffer();
            return new Blob([arrayBuffer]);
          })();
          
          const timeoutPromise = new Promise<Blob>((_, reject) => {
            setTimeout(() => reject(new Error('Download timeout')), timeoutMs);
          });
          
          fileData = await Promise.race([downloadPromise, timeoutPromise]);
          break;
          
        } catch (error: any) {
          lastError = error;
          const attemptDuration = Date.now() - downloadStart;
          
          if (attempt < maxRetries) {
            const backoffMs = Math.pow(2, attempt) * 2000;
            await new Promise(resolve => setTimeout(resolve, backoffMs));
          }
        }
      }
      
      if (!fileData) {
        throw new Error(`Failed to download file after ${maxRetries} attempts: ${lastError?.message}`);
      }
      
    } // End of if (!fileData) - download from Blob
    
    const processingStart = Date.now();
    
    const { processDocumentWithLangChain } = await import('./langchain-processor');
    
    // Vercel functions timeout at 10s, but processing can take longer
    // We'll handle this gracefully and retry on next cycle
    try {
      await processDocumentWithLangChain(
        job,
        fileData,
      supabase
    );
      
    } catch (processingError: any) {
      throw processingError;
    }
    
    // 4. Mark job as completed
    // Retry marking as completed (network issues can cause failures)
    let completeSuccess = false;
    for (let attempt = 1; attempt <= 3 && !completeSuccess; attempt++) {
      const { error: completeError } = await supabase
        .from('ingestion_jobs')
        .update({
          status: JOB_STATUS.COMPLETED,
          completed_at: new Date().toISOString(),
          processing_metadata: {
            ...job.processing_metadata,
            processing_duration_ms: Date.now() - jobStartTime
          }
        })
        .eq('id', job.id);
      
      if (!completeError) {
        completeSuccess = true;
      } else {
        if (attempt < 3) {
          await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1s before retry
        }
      }
    }
    
    // 5. Update document status
    if (job.document_id) {
      await supabase
        .from('documents')
        .update({ processing_status: 'completed' })
        .eq('id', job.document_id);
    }
    
  } catch (error) {
    // Handle job failure with retry logic
    await handleJobFailure(job, error, supabase);
  }
}

// =====================================================
// ERROR HANDLING
// =====================================================

async function handleJobFailure(
  job: IngestionJob,
  error: unknown,
  supabase: any
): Promise<void> {
  const nextAttempt = job.attempts + 1;
  const canRetry = shouldRetry(job);
  const { message, stack } = formatJobError(error);
  
  const updates: Partial<IngestionJob> = {
    status: canRetry ? JOB_STATUS.PENDING : JOB_STATUS.FAILED,
    attempts: nextAttempt,
    error_message: message.substring(0, 1000), // Truncate
    error_stack: stack?.substring(0, 5000) // Truncate
  };
  
  // Add retry timestamp if retrying
  if (canRetry) {
    updates.next_retry_at = calculateNextRetry(nextAttempt).toISOString();
  }
  
  // Update job status
  const { error: updateError } = await supabase
    .from('ingestion_jobs')
    .update(updates as any)
    .eq('id', job.id);
  
  if (updateError) {
    console.error('Failed to update job error status:', updateError);
  }
  
  // Update document status if exists
  if (job.document_id) {
    await supabase
      .from('documents')
      .update({ 
        processing_status: 'error',
        error_message: message.substring(0, 500)
      })
      .eq('id', job.document_id);
  }
}
