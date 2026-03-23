/**
 * Admin endpoint to strip base64 file data from completed ingestion jobs.
 * Prevents DB bloat from file_data_base64 payloads stored in processing_metadata.
 * 
 * Usage: GET /api/admin/cleanup-jobs?secret=YOUR_CRON_SECRET
 * Can be called via Vercel Cron or manually.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Strip file_data_base64 from completed jobs older than 1 hour
    const { data, error } = await supabase.rpc('cleanup_job_base64', {
      cutoff_interval: '1 hour',
    });

    if (error) {
      // Fallback: direct query if the RPC function doesn't exist
      const { data: jobs, error: fetchError } = await supabase
        .from('ingestion_jobs')
        .select('id, processing_metadata')
        .eq('status', 'completed')
        .not('processing_metadata->file_data_base64', 'is', null)
        .lt('completed_at', new Date(Date.now() - 60 * 60 * 1000).toISOString());

      if (fetchError) {
        return NextResponse.json({
          error: 'Failed to query jobs',
          details: fetchError.message,
        }, { status: 500 });
      }

      let cleaned = 0;
      for (const job of jobs || []) {
        const meta = job.processing_metadata as any;
        if (meta?.file_data_base64) {
          const { file_data_base64: _, ...cleanMeta } = meta;
          await supabase
            .from('ingestion_jobs')
            .update({ processing_metadata: { ...cleanMeta, base64_stripped: true } })
            .eq('id', job.id);
          cleaned++;
        }
      }

      return NextResponse.json({
        success: true,
        method: 'fallback_loop',
        jobs_cleaned: cleaned,
      });
    }

    return NextResponse.json({
      success: true,
      method: 'rpc',
      result: data,
    });
  } catch (error: any) {
    return NextResponse.json({
      error: 'Cleanup failed',
      details: error.message,
    }, { status: 500 });
  }
}
