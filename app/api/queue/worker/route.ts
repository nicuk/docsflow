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

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // 1. Verify this is a legitimate cron request
    const authHeader = request.headers.get('Authorization');
    const expectedAuth = `Bearer ${process.env.CRON_SECRET}`;
    
    if (!authHeader || authHeader !== expectedAuth) {
      console.warn('⚠️ Unauthorized worker access attempt');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    console.log('🔄 [WORKER] Starting job processing cycle...');
    
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
    
    if (resetCount && resetCount.length > 0 && resetCount[0].reset_count > 0) {
      console.log(`🔄 [WORKER] Reset ${resetCount[0].reset_count} stale jobs`);
    }
    
    // 4. Atomically fetch pending jobs (with lock)
    const { data: jobs, error: fetchError } = await supabase
      .rpc('get_pending_jobs', {
        p_max_jobs: WORKER_CONFIG.global_max_concurrent
      }) as { data: IngestionJob[] | null, error: any };
    
    if (fetchError) {
      console.error('❌ [WORKER] Error fetching jobs:', fetchError);
      return NextResponse.json(
        { error: 'Failed to fetch jobs', details: fetchError.message },
        { status: 500 }
      );
    }
    
    if (!jobs || jobs.length === 0) {
      console.log('✅ [WORKER] No pending jobs to process');
      return NextResponse.json({
        message: 'No jobs to process',
        processed: 0,
        jobs: [],
        duration_ms: Date.now() - startTime
      });
    }
    
    console.log(`📋 [WORKER] Found ${jobs.length} pending jobs`);
    
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
          console.log(`⏭️  [WORKER] Skipping job ${job.id} - tenant ${job.tenant_id} at max concurrency (${totalCount}/${WORKER_CONFIG.per_tenant_max_concurrent})`);
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
          console.error(`❌ [WORKER] Failed to mark job ${job.id} as processing:`, updateError);
          continue;
        }
        
        // Track tenant job count
        tenantJobCounts.set(job.tenant_id, (tenantJobCounts.get(job.tenant_id) || 0) + 1);
        
        // Process job asynchronously (fire and forget)
        processJob(job, supabase).catch(error => {
          console.error(`❌ [WORKER] Job ${job.id} processing failed:`, error);
          // Error is already handled in processJob
        });
        
        processedJobIds.push(job.id);
        console.log(`✅ [WORKER] Started processing job ${job.id} (${job.filename})`);
        
      } catch (error) {
        console.error(`❌ [WORKER] Error processing job ${job.id}:`, error);
        // Continue to next job
      }
    }
    
    // 6. Return processing summary
    const result: WorkerProcessResult = {
      processed: processedJobIds.length,
      jobs: processedJobIds
    };
    
    const duration = Date.now() - startTime;
    console.log(`✅ [WORKER] Cycle complete: ${result.processed} jobs started in ${duration}ms`);
    
    return NextResponse.json({
      ...result,
      duration_ms: duration,
      tenant_stats: Object.fromEntries(tenantJobCounts)
    });
    
  } catch (error) {
    console.error('❌ [WORKER] Fatal error:', error);
    
    return NextResponse.json(
      { 
        error: 'Worker error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// =====================================================
// JOB PROCESSING LOGIC
// =====================================================

async function processJob(
  job: IngestionJob,
  supabase: ReturnType<typeof createClient>
): Promise<void> {
  const jobStartTime = Date.now();
  
  try {
    console.log(`🚀 [JOB ${job.id}] Starting processing: ${job.filename}`);
    
    // 1. Download file from storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('documents')
      .download(job.file_path);
    
    if (downloadError || !fileData) {
      throw new Error(`Failed to download file: ${downloadError?.message || 'File not found'}`);
    }
    
    console.log(`📥 [JOB ${job.id}] File downloaded: ${fileData.size} bytes`);
    
    // 2. Process document with enhanced multimodal parsing
    await processDocumentContent(
      job,
      fileData,
      supabase
    );
    
    // 4. Mark job as completed
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
    
    if (completeError) {
      console.error(`⚠️ [JOB ${job.id}] Failed to mark as completed:`, completeError);
    }
    
    // 5. Update document status
    if (job.document_id) {
      await supabase
        .from('documents')
        .update({ processing_status: 'completed' })
        .eq('id', job.document_id);
    }
    
    const duration = Date.now() - jobStartTime;
    console.log(`✅ [JOB ${job.id}] Completed in ${duration}ms`);
    
  } catch (error) {
    console.error(`❌ [JOB ${job.id}] Processing failed:`, error);
    
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
  supabase: ReturnType<typeof createClient>
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
    console.log(`🔄 [JOB ${job.id}] Will retry (attempt ${nextAttempt}/${job.max_attempts}) at ${updates.next_retry_at}`);
  } else {
    console.error(`💀 [JOB ${job.id}] Permanently failed after ${job.max_attempts} attempts`);
  }
  
  // Update job status
  const { error: updateError } = await supabase
    .from('ingestion_jobs')
    .update(updates as any)
    .eq('id', job.id);
  
  if (updateError) {
    console.error(`❌ [JOB ${job.id}] Failed to update error status:`, updateError);
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

// =====================================================
// DOCUMENT PROCESSING
// =====================================================

async function processDocumentContent(
  job: IngestionJob,
  fileData: Blob,
  supabase: ReturnType<typeof createClient>
): Promise<void> {
  // 🚀 ENHANCED PROCESSING: Use multimodal parser for high-quality chunking
  console.log(`📝 [JOB ${job.id}] Starting enhanced document processing`);
  
  const { SecureDocumentService } = await import('@/lib/secure-database');
  const { MultimodalDocumentParser } = await import('@/lib/rag-multimodal-parser');
  const { isFeatureEnabled } = await import('@/lib/feature-flags');
  
  // Convert blob to buffer
  const arrayBuffer = await fileData.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  
  let parsedDocument;
  let parseMethod: 'advanced' | 'basic' = 'basic';
  
  // Check if multimodal parsing is enabled
  const useMultimodal = job.processing_metadata?.use_multimodal || 
                       isFeatureEnabled('MULTIMODAL_PARSING', job.tenant_id);
  
  if (useMultimodal) {
    console.log(`[JOB ${job.id}] Using multimodal parser`);
    
    try {
      const parser = new MultimodalDocumentParser(job.tenant_id);
      parsedDocument = await parser.parseDocument(
        buffer,
        job.file_type || 'application/octet-stream',
        job.filename
      );
      parseMethod = parsedDocument.metadata.parse_method as 'advanced' | 'basic';
      
      // Generate embeddings for chunks if advanced parsing succeeded
      if (parseMethod === 'advanced') {
        parsedDocument = await parser.generateEmbeddings(parsedDocument.chunks);
      }
    } catch (error) {
      console.error(`[JOB ${job.id}] Multimodal parsing failed, using fallback:`, error);
      // Fallback to basic parsing
      const textContent = buffer.toString('utf-8').substring(0, 100000);
      parsedDocument = {
        text: textContent,
        metadata: {
          tenant_id: job.tenant_id,
          mime_type: job.file_type,
          parse_method: 'basic'
        },
        chunks: []
      };
    }
  } else {
    console.log(`[JOB ${job.id}] Using basic parser`);
    const textContent = buffer.toString('utf-8').substring(0, 100000);
    parsedDocument = {
      text: textContent,
      metadata: {
        tenant_id: job.tenant_id,
        mime_type: job.file_type,
        parse_method: 'basic'
      },
      chunks: []
    };
  }
  
  console.log(`📝 [JOB ${job.id}] Parsed document with ${parsedDocument.chunks.length} chunks (method: ${parseMethod})`);
  
  // Update document record with parsed content
  await supabase
    .from('documents')
    .update({
      content: parsedDocument.text || '',
      metadata: {
        ...parsedDocument.metadata,
        parse_method: parseMethod,
        processed_at: new Date().toISOString()
      },
      processing_status: 'processing', // Still processing chunks
      processing_progress: 50
    })
    .eq('id', job.document_id);
  
  // Store chunks with embeddings
  if (parsedDocument.chunks.length > 0) {
    console.log(`💾 [JOB ${job.id}] Storing ${parsedDocument.chunks.length} chunks...`);
    
    for (const [index, chunk] of parsedDocument.chunks.entries()) {
      try {
        await SecureDocumentService.insertDocumentChunk({
          document_id: job.document_id!,
          content: chunk.content,
          type: chunk.type,
          position: index,
          metadata: {
            ...chunk.metadata,
            filename: job.filename // 🎯 Include filename for search
          },
          embedding: chunk.embedding
        }, job.tenant_id);
        
        // Update progress
        const progress = 50 + Math.floor((index + 1) / parsedDocument.chunks.length * 50);
        await supabase
          .from('documents')
          .update({ processing_progress: progress })
          .eq('id', job.document_id);
      
    } catch (error) {
        console.error(`⚠️ [JOB ${job.id}] Failed to store chunk ${index}:`, error);
      // Continue with other chunks
      }
    }
  }
  
  // Update final document metadata
  await supabase
    .from('documents')
    .update({
      processing_progress: 100,
      metadata: {
        ...parsedDocument.metadata,
        // ✅ Store chunk count in metadata (not as column)
        chunk_count: parsedDocument.chunks.length,
        has_tables: (parsedDocument.metadata.tables?.length || 0) > 0,
        has_images: (parsedDocument.metadata.images?.length || 0) > 0
      }
    })
    .eq('id', job.document_id);
  
  console.log(`✅ [JOB ${job.id}] Successfully processed ${parsedDocument.chunks.length} chunks`);
}

// =====================================================
// HEALTH CHECK ENDPOINT
// =====================================================

export async function GET(request: NextRequest) {
  try {
    // Simple health check - verify database connection
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

