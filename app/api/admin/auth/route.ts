import { NextRequest, NextResponse } from 'next/server';
import { authenticateAdmin, logAdminAction } from '@/lib/platform-auth';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Authenticate admin
    const token = authenticateAdmin(email, password);

    if (!token) {
      // Log failed attempt
      logAdminAction('FAILED_LOGIN_ATTEMPT', { email }, 'unknown');
      
      return NextResponse.json(
        { success: false, error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Log successful login
    logAdminAction('SUCCESSFUL_LOGIN', { email }, email);

    return NextResponse.json({
      success: true,
      token,
      message: 'Authentication successful'
    });

  } catch (error) {
    console.error('Admin auth error:', error);
    
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  );
}