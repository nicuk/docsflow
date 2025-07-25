import { NextRequest, NextResponse } from 'next/server';
import { getCORSHeaders } from '@/lib/utils';

export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get('origin');
  return new NextResponse(null, { status: 200, headers: getCORSHeaders(origin) });
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get('origin');
  const corsHeaders = getCORSHeaders(origin);

  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400, headers: corsHeaders }
      );
    }

    // TODO: Implement password reset logic with Supabase
    console.log('Password reset requested for:', email);

    return NextResponse.json({
      message: 'Password reset email sent',
      success: true
    }, { headers: corsHeaders });

  } catch (error) {
    console.error('Forgot password error:', error);
    return NextResponse.json(
      { error: 'Failed to process password reset' },
      { status: 500, headers: corsHeaders }
    );
  }
} 