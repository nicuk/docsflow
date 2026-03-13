import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { samlService } from '@/lib/saml/saml-service';


export async function POST(
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

    // Parse form data from SAML response
    const formData = await request.formData();
    const samlResponse = formData.get('SAMLResponse') as string;
    const relayState = formData.get('RelayState') as string;

    if (!samlResponse) {
      return NextResponse.json(
        { error: 'Missing SAML response' },
        { status: 400 }
      );
    }

    // Validate SAML response and extract user profile
    const userProfile = await samlService.validateSAMLResponse(tenantId, samlResponse);
    
    if (!userProfile) {
      return NextResponse.json(
        { error: 'Invalid SAML response' },
        { status: 400 }
      );
    }

    // Get tenant SAML configuration
    const tenantConfig = await samlService.getTenantSAMLConfig(tenantId);
    if (!tenantConfig) {
      return NextResponse.json(
        { error: 'SAML configuration not found' },
        { status: 400 }
      );
    }

    // Map SAML attributes to user data
    const userData = samlService.mapSAMLAttributesToUser(
      userProfile, 
      tenantConfig.attribute_mapping
    );

    // Provision or update user
    const user = await samlService.provisionUserFromSAML(
      tenantId,
      userData,
      tenantConfig
    );

    // Create Supabase session
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          },
        },
      }
    );

    // Create a session for the SAML user in Supabase
    // Note: For SAML users, we'll create a custom session since they don't have passwords
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email: userData.email,
      email_confirm: true,
      user_metadata: {
        name: userData.name,
        auth_provider: 'saml',
        tenant_id: tenantId,
      },
    });

    if (authError && authError.message !== 'User already registered') {
      return NextResponse.json(
        { error: 'Failed to create user session' },
        { status: 500 }
      );
    }

    // Generate session tokens for the user
    const { data: sessionData, error: sessionError } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email: userData.email,
    });

    if (sessionError) {
      return NextResponse.json(
        { error: 'Failed to generate session' },
        { status: 500 }
      );
    }

    // Set session cookies
    const response = NextResponse.redirect(
      new URL(relayState || '/dashboard', process.env.NEXT_PUBLIC_APP_URL!)
    );

    // Set authentication cookies
    response.cookies.set('saml_authenticated', 'true', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      domain: process.env.NODE_ENV === 'production' ? '.docsflow.app' : undefined,
      path: '/'
    });

    response.cookies.set('user_email', userData.email, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      domain: process.env.NODE_ENV === 'production' ? '.docsflow.app' : undefined,
      path: '/'
    });

    response.cookies.set('tenant_id', tenantId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      domain: process.env.NODE_ENV === 'production' ? '.docsflow.app' : undefined,
      path: '/'
    });

    return response;

  } catch (error) {
    // Redirect to login with error
    const errorUrl = new URL('/login', process.env.NEXT_PUBLIC_APP_URL!);
    errorUrl.searchParams.set('error', 'saml_authentication_failed');
    
    return NextResponse.redirect(errorUrl);
  }
}

// Handle GET requests (some IdPs might use GET for callback)
export async function GET(request: NextRequest, context: any) {
  // For GET requests, extract SAML response from query parameters
  const samlResponse = request.nextUrl.searchParams.get('SAMLResponse');
  const relayState = request.nextUrl.searchParams.get('RelayState');
  
  if (!samlResponse) {
    return NextResponse.json(
      { error: 'Missing SAML response' },
      { status: 400 }
    );
  }

  // Create a new request with form data for POST handler
  const formData = new FormData();
  formData.append('SAMLResponse', samlResponse);
  if (relayState) {
    formData.append('RelayState', relayState);
  }

  const newRequest = new NextRequest(request.url, {
    method: 'POST',
    body: formData,
    headers: request.headers,
  });

  return POST(newRequest, context);
}
