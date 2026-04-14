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
    // Return support information
    const supportInfo = {
      status: 'available',
      channels: [
        {
          type: 'email',
          contact: 'support@docsflow.app',
          responseTime: '24 hours'
        },
        {
          type: 'chat',
          available: true,
          hours: '9 AM - 6 PM EST'
        },
        {
          type: 'documentation',
          url: '/docs',
          available: true
        }
      ],
      faq: [
        {
          question: 'How do I upload documents?',
          answer: 'Use the upload button in your dashboard to add PDF, Word, or text files.'
        },
        {
          question: 'How does the AI analysis work?',
          answer: 'Our AI processes your documents using advanced NLP and provides intelligent insights.'
        }
      ]
    };
    
    return NextResponse.json(supportInfo, { headers: corsHeaders });
    
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get('origin');
  const corsHeaders = getCORSHeaders(origin);
  
  try {
    const { subject, message, email, priority = 'normal' } = await request.json();
    
    if (!subject || !message || !email) {
      return NextResponse.json(
        { error: 'Subject, message, and email are required' },
        { status: 400, headers: corsHeaders }
      );
    }
    
    const ticketId = `TICKET-${Date.now()}`;
    
    return NextResponse.json(
      { 
        message: 'Support ticket created successfully',
        ticketId,
        status: 'submitted',
        estimatedResponse: priority === 'urgent' ? '2 hours' : '24 hours'
      },
      { headers: corsHeaders }
    );
    
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: corsHeaders }
    );
  }
} 