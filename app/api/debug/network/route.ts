import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const hostname = request.headers.get('host') || '';
  
  return NextResponse.json({
    success: true,
    message: 'Network debug endpoint working',
    data: {
      hostname,
      url: url.toString(),
      pathname: url.pathname,
      method: request.method,
      headers: Object.fromEntries(request.headers.entries()),
      timestamp: new Date().toISOString()
    }
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    return NextResponse.json({
      success: true,
      message: 'Network debug POST working',
      receivedData: body,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Failed to parse JSON body',
      timestamp: new Date().toISOString()
    }, { status: 400 });
  }
}
