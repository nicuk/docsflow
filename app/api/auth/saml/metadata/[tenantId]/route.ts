import { NextRequest, NextResponse } from 'next/server';
import { samlService } from '@/lib/saml/saml-service';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  try {
    const { tenantId } = await params;
    
    if (!tenantId) {
      return NextResponse.json(
        { error: 'Invalid tenant' },
        { status: 400 }
      );
    }

    // Generate SP metadata XML
    const metadata = await samlService.generateSPMetadata(tenantId);
    
    if (!metadata) {
      return NextResponse.json(
        { error: 'SAML not configured for this tenant' },
        { status: 400 }
      );
    }

    // Return XML metadata with correct content type
    return new NextResponse(metadata, {
      status: 200,
      headers: {
        'Content-Type': 'application/xml',
        'Content-Disposition': `attachment; filename="sp-metadata-${tenantId}.xml"`,
      },
    });
    
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
