import { NextRequest, NextResponse } from 'next/server';
import { samlService } from '@/lib/saml/saml-service';
import { validateTenantContext } from '@/lib/api-tenant-validation';

export async function GET(
  request: NextRequest,
  { params }: { params: { tenantId: string } }
) {
  try {
    const { tenantId } = params;
    
    // Validate tenant context
    const tenantValidation = await validateTenantContext(request, {
      requireAuth: false,
      extractTenantId: () => tenantId
    });

    if (!tenantValidation.isValid || !tenantValidation.tenant) {
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
    console.error('SAML metadata error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
