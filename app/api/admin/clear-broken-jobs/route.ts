/**
 * Admin endpoint to clear broken ingestion jobs with null document_id
 * 
 * Usage: GET /api/admin/clear-broken-jobs?secret=YOUR_CRON_SECRET
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
    
    // Find broken jobs with null document_id
    const { data: brokenJobs, error: findError } = await supabase
      .from('ingestion_jobs')
      .select('id, filename, status, created_at')
      .is('document_id', null);
    
    if (findError) {
      return NextResponse.json({ error: findError.message }, { status: 500 });
    }
    
    const count = brokenJobs?.length || 0;
    
    if (count === 0) {
      return NextResponse.json({ 
        message: 'No broken jobs found',
        deleted: 0 
      });
    }
    
    // Delete them
    const { error: deleteError } = await supabase
      .from('ingestion_jobs')
      .delete()
      .is('document_id', null);
    
    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }
    
    return NextResponse.json({
      message: `Deleted ${count} broken jobs`,
      deleted: count,
      jobs: brokenJobs
    });
    
  } catch (error: any) {
    return NextResponse.json({ 
      error: error.message 
    }, { status: 500 });
  }
}

