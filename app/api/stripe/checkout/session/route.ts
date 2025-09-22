import { NextRequest, NextResponse } from 'next/server';
import { createCheckoutSession, STRIPE_PRICE_IDS } from '@/lib/stripe-client';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { planType, tenantId } = body;

    // Validate required fields
    if (!planType || !tenantId) {
      return NextResponse.json(
        { error: 'Missing required fields: planType, tenantId' },
        { status: 400 }
      );
    }

    // Validate plan type
    const priceId = STRIPE_PRICE_IDS[planType as keyof typeof STRIPE_PRICE_IDS];
    if (!priceId) {
      return NextResponse.json(
        { error: 'Invalid plan type' },
        { status: 400 }
      );
    }

    // Get user from Supabase session
    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
          set(name: string, value: string, options: any) {
            cookieStore.set({ name, value, ...options });
          },
          remove(name: string, options: any) {
            cookieStore.delete({ name, ...options });
          },
        },
      }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Verify user has access to this tenant
    const { data: userTenant, error: tenantError } = await supabase
      .from('users')
      .select('tenant_id')
      .eq('id', user.id)
      .eq('tenant_id', tenantId)
      .single();

    if (tenantError || !userTenant) {
      return NextResponse.json(
        { error: 'Unauthorized access to tenant' },
        { status: 403 }
      );
    }

    // Create checkout session
    const baseUrl = request.nextUrl.origin;
    const { session, error } = await createCheckoutSession({
      priceId,
      tenantId,
      userEmail: user.email!,
      successUrl: `${baseUrl}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${baseUrl}/billing/cancel`,
    });

    if (error || !session) {
      console.error('Checkout session error:', error);
      return NextResponse.json(
        { error: 'Failed to create checkout session' },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      sessionId: session.id,
      url: session.url 
    });

  } catch (error) {
    console.error('Checkout session API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
