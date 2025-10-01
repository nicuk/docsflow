import { NextRequest, NextResponse } from 'next/server';
import { getCORSHeaders } from '@/lib/utils';

export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get('origin');
  return new NextResponse(null, { status: 200, headers: getCORSHeaders(origin) });
}

export async function GET(request: NextRequest) {
  const origin = request.headers.get('origin');
  const corsHeaders = getCORSHeaders(origin);
  
  try {
    // Basic health check (sanitized for public consumption)
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      // Removed: uptime, version, environment (security: reduce info disclosure)
    };
    
    return NextResponse.json(health, { headers: corsHeaders });
    
  } catch (error) {
    console.error('Health check error:', error);
    return NextResponse.json(
      { 
        status: 'unhealthy', 
        error: 'Internal server error',
        timestamp: new Date().toISOString()
      }, 
      { status: 500, headers: corsHeaders }
    );
  }
} 