import Stripe from 'stripe';

// 🎯 BUILD FIX: Make Stripe optional during build time
const stripeKey = process.env.STRIPE_SECRET_KEY;

export const stripe = stripeKey ? new Stripe(stripeKey, {
  apiVersion: '2024-06-20',
  appInfo: {
    name: 'AI Lead Router SaaS',
    version: '1.0.0',
  },
}) : null;

// Stripe price IDs for your subscription plans
export const STRIPE_PRICE_IDS = {
  starter: process.env.STRIPE_STARTER_PRICE_ID || '',
  professional: process.env.STRIPE_PROFESSIONAL_PRICE_ID || '',
  enterprise: process.env.STRIPE_ENTERPRISE_PRICE_ID || '',
  unlimited: process.env.STRIPE_UNLIMITED_PRICE_ID || '',
} as const;

// Create checkout session
export async function createCheckoutSession({
  priceId,
  tenantId,
  userEmail,
  successUrl,
  cancelUrl,
}: {
  priceId: string;
  tenantId: string;
  userEmail: string;
  successUrl: string;
  cancelUrl: string;
}) {
  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
      customer_email: userEmail,
      metadata: {
        tenantId,
      },
      subscription_data: {
        metadata: {
          tenantId,
        },
      },
    });

    return { session, error: null };
  } catch (error) {
    console.error('Error creating checkout session:', error);
    return { session: null, error: error as Error };
  }
}

// Create customer portal session
export async function createPortalSession({
  customerId,
  returnUrl,
}: {
  customerId: string;
  returnUrl: string;
}) {
  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });

    return { session, error: null };
  } catch (error) {
    console.error('Error creating portal session:', error);
    return { session: null, error: error as Error };
  }
}

// Retrieve subscription
export async function getSubscription(subscriptionId: string) {
  try {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    return { subscription, error: null };
  } catch (error) {
    console.error('Error retrieving subscription:', error);
    return { subscription: null, error: error as Error };
  }
}

// Cancel subscription
export async function cancelSubscription(subscriptionId: string) {
  try {
    const subscription = await stripe.subscriptions.cancel(subscriptionId);
    return { subscription, error: null };
  } catch (error) {
    console.error('Error canceling subscription:', error);
    return { subscription: null, error: error as Error };
  }
}

// Update subscription
export async function updateSubscription({
  subscriptionId,
  priceId,
}: {
  subscriptionId: string;
  priceId: string;
}) {
  try {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    
    const updatedSubscription = await stripe.subscriptions.update(subscriptionId, {
      items: [
        {
          id: subscription.items.data[0].id,
          price: priceId,
        },
      ],
      proration_behavior: 'create_prorations',
    });

    return { subscription: updatedSubscription, error: null };
  } catch (error) {
    console.error('Error updating subscription:', error);
    return { subscription: null, error: error as Error };
  }
}
