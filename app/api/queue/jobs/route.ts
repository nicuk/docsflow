/**
 * Jobs API Route
 * 
 * Provides job listing and statistics for the dashboard.
 * GET: List jobs with optional filtering
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { validateAuth } from '@/lib/auth-helpers';
import type { IngestionJob, JobStats } from '@/lib/queue';

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
    
    // 2. Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '100');
    
    // 3. Create Supabase client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    
    // 4. Fetch jobs
    let query = supabase
      .from('ingestion_jobs')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(limit);
    
    if (status && status !== 'all') {
      query = query.eq('status', status);
    }
    
    const { data: jobs, error: jobsError } = await query;
    
    if (jobsError) {
      return NextResponse.json(
        { error: 'Failed to fetch jobs' },
        { status: 500 }
      );
    }
    
    // 5. Fetch statistics
    const { data: statsData } = await supabase
      .rpc('get_job_stats', { p_tenant_id: tenantId });
    
    const stats: JobStats = statsData?.[0] || {
      total_jobs: 0,
      pending: 0,
      processing: 0,
      completed: 0,
      failed: 0
    };
    
    return NextResponse.json({
      jobs: jobs || [],
      stats,
      count: jobs?.length || 0
    });
    
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

