/**
 * Admin endpoint to clear ALL failed ingestion jobs
 * 
 * Usage: GET /api/admin/clear-failed-jobs?secret=YOUR_CRON_SECRET
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    
    // Find all failed jobs
    const { data: failedJobs, error: findError } = await supabase
      .from('ingestion_jobs')
      .select('id, filename, status, created_at, error_message')
      .in('status', ['failed', 'error']);
    
    if (findError) {
      console.error('[Clear Failed Jobs] Error finding jobs:', findError);
      return NextResponse.json({ error: findError.message }, { status: 500 });
    }
    
    const count = failedJobs?.length || 0;
    
    console.log(`[Clear Failed Jobs] Found ${count} failed jobs`);
    failedJobs?.forEach(job => {
      console.log(`   - ${job.id}: ${job.filename} (${job.status})`);
    });
    
    if (count === 0) {
      return NextResponse.json({ 
        message: 'No failed jobs found',
        deleted: 0 
      });
    }
    
    // Delete them
    const { error: deleteError } = await supabase
      .from('ingestion_jobs')
      .delete()
      .in('status', ['failed', 'error']);
    
    if (deleteError) {
      console.error('[Clear Failed Jobs] Error deleting:', deleteError);
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }
    
    console.log(`[Clear Failed Jobs] ✅ Deleted ${count} failed jobs`);
    
    return NextResponse.json({
      message: `Deleted ${count} failed jobs`,
      deleted: count,
      jobs: failedJobs
    });
    
  } catch (error: any) {
    console.error('[Clear Failed Jobs] Error:', error);
    return NextResponse.json({ 
      error: error.message 
    }, { status: 500 });
  }
}

