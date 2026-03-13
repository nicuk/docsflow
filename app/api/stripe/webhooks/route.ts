import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { stripe } from '@/lib/stripe-client';
import { createServerClient } from '@supabase/ssr';
import Stripe from 'stripe';

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const headersList = await headers();
    const signature = headersList.get('stripe-signature');

    if (!signature) {
      return NextResponse.json(
        { error: 'Missing signature' },
        { status: 400 }
      );
    }

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 400 }
      );
    }

    // Initialize Supabase client
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        cookies: {
          get() { return undefined; },
          set() {},
          remove() {},
        },
      }
    );

    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutCompleted(session, supabase);
        break;
      }
      
      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        await handlePaymentSucceeded(invoice, supabase);
        break;
      }
      
      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        await handlePaymentFailed(invoice, supabase);
        break;
      }
      
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionUpdated(subscription, supabase);
        break;
      }
      
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionCanceled(subscription, supabase);
        break;
      }
      
      default:
        break;
    }

    return NextResponse.json({ received: true });

  } catch (error) {
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session, supabase: any) {
  const tenantId = session.metadata?.tenantId;
  
  if (!tenantId) {
    return;
  }

  try {
    // Get subscription details
    const subscription = await stripe.subscriptions.retrieve(session.subscription as string) as any;
    
    // Determine plan type from price ID
    const priceId = subscription.items.data[0].price.id;
    let planType = 'starter';
    
    // Map price ID to plan type (you'll need to set these in your .env)
    if (priceId === process.env.STRIPE_PROFESSIONAL_PRICE_ID) planType = 'professional';
    else if (priceId === process.env.STRIPE_ENTERPRISE_PRICE_ID) planType = 'enterprise';
    else if (priceId === process.env.STRIPE_UNLIMITED_PRICE_ID) planType = 'unlimited';

    // Update tenant with subscription info
    const { error: tenantError } = await supabase
      .from('tenants')
      .update({
        plan_type: planType,
        subscription_status: 'active',
        updated_at: new Date().toISOString()
      })
      .eq('id', tenantId);

    if (tenantError) {
      return;
    }

    // Create or update subscription record
    const { error: subscriptionError } = await supabase
      .from('subscriptions')
      .upsert({
        tenant_id: tenantId,
        stripe_subscription_id: subscription.id,
        stripe_customer_id: subscription.customer as string,
        plan_name: planType,
        status: subscription.status,
        current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
        current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
        price_cents: subscription.items.data[0].price.unit_amount || 0,
        currency: subscription.items.data[0].price.currency || 'usd',
        billing_cycle: subscription.items.data[0].price.recurring?.interval || 'monthly',
        updated_at: new Date().toISOString()
      });

    if (subscriptionError) {
      // Failed to create subscription record
    }

  } catch (error) {
    // Error handling checkout completion
  }
}

async function handlePaymentSucceeded(invoice: any, supabase: any) {
  if (!invoice.subscription) return;

  try {
    const { error } = await supabase
      .from('subscriptions')
      .update({
        status: 'active',
        current_period_start: new Date(invoice.period_start * 1000).toISOString(),
        current_period_end: new Date(invoice.period_end * 1000).toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('stripe_subscription_id', invoice.subscription);

    if (error) {
      // Error updating subscription after payment
    }
  } catch (error) {
    // Error handling payment succeeded
  }
}

async function handlePaymentFailed(invoice: any, supabase: any) {
  if (!invoice.subscription) return;

  try {
    const { error } = await supabase
      .from('subscriptions')
      .update({
        status: 'past_due',
        updated_at: new Date().toISOString()
      })
      .eq('stripe_subscription_id', invoice.subscription);

    if (error) {
      // Error updating subscription after failed payment
    }
  } catch (error) {
    // Error handling payment failed
  }
}

async function handleSubscriptionUpdated(subscription: any, supabase: any) {
  try {
    const { error } = await supabase
      .from('subscriptions')
      .update({
        status: subscription.status,
        current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
        current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('stripe_subscription_id', subscription.id);

    if (error) {
      // Error updating subscription
    }
  } catch (error) {
    // Error handling subscription updated
  }
}

async function handleSubscriptionCanceled(subscription: any, supabase: any) {
  try {
    const { error } = await supabase
      .from('subscriptions')
      .update({
        status: 'canceled',
        updated_at: new Date().toISOString()
      })
      .eq('stripe_subscription_id', subscription.id);

    if (error) {
      // Error updating canceled subscription
    }
  } catch (error) {
    // Error handling subscription canceled
  }
}

