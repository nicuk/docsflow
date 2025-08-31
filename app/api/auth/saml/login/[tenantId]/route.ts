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

    // Get relay state (redirect URL after login)
    const relayState = request.nextUrl.searchParams.get('RelayState') || '/dashboard';

    // Generate SAML login URL
    const loginUrl = await samlService.generateLoginURL(tenantId, relayState);
    
    if (!loginUrl) {
      return NextResponse.json(
        { error: 'SAML not configured for this tenant' },
        { status: 400 }
      );
    }

    // Redirect to IdP login
    return NextResponse.redirect(loginUrl);
    
  } catch (error) {
    console.error('SAML login error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  // Handle SP-initiated SAML login
  return GET(request, { params: { tenantId: '' } });
}
