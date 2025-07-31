import { NextRequest, NextResponse } from 'next/server';
import { getCORSHeaders } from '@/lib/utils';

export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get('origin');
  return new NextResponse(null, { status: 200, headers: getCORSHeaders(origin) });
}

export async function GET(request: NextRequest) {
  const origin = request.headers.get('origin');
  const corsHeaders = getCORSHeaders(origin);

  // OAuth is handled entirely by Supabase on the frontend
  // This endpoint returns a redirect to indicate OAuth should be handled client-side
  return NextResponse.json({
    message: 'OAuth handled by Supabase client-side',
    redirect: 'Use Supabase Auth on frontend for Google OAuth'
  }, { 
    status: 200,
    headers: corsHeaders 
  });
}
