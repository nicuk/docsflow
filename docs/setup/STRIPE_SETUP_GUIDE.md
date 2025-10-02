# 🚀 Stripe Integration Setup Guide

## Overview

This guide will walk you through setting up Stripe payment integration for your AI Lead Router SaaS. The implementation includes subscription management, usage tracking, and plan enforcement.

## 🔧 Prerequisites

- Stripe account (sign up at [stripe.com](https://stripe.com))
- Access to your Supabase project
- Environment variables access

## 📋 Setup Steps

### 1. Stripe Account Configuration

#### Create Products in Stripe Dashboard
1. Go to **Products** in your Stripe Dashboard
2. Create the following products:

**Starter Plan**
- Product name: "Starter Plan"
- Billing: Recurring
- Price: $29/month
- Copy the Price ID (starts with `price_`)

**Professional Plan**
- Product name: "Professional Plan"  
- Billing: Recurring
- Price: $99/month
- Copy the Price ID

**Enterprise Plan**
- Product name: "Enterprise Plan"
- Billing: Recurring  
- Price: $299/month
- Copy the Price ID

**Unlimited Plan**
- Product name: "Unlimited Plan"
- Billing: Recurring
- Price: $999/month
- Copy the Price ID

#### Configure Webhooks
1. Go to **Developers > Webhooks** in Stripe Dashboard
2. Click **Add endpoint**
3. Set endpoint URL: `https://yourdomain.com/api/stripe/webhooks`
4. Select events to listen for:
   - `checkout.session.completed`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
5. Copy the **Webhook signing secret** (starts with `whsec_`)

### 2. Environment Variables

Add these to your `.env.local` file:

```bash
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_... # Use sk_live_... for production
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_... # Use pk_live_... for production
STRIPE_WEBHOOK_SECRET=whsec_...

# Stripe Price IDs (from step 1)
STRIPE_STARTER_PRICE_ID=price_...
STRIPE_PROFESSIONAL_PRICE_ID=price_...
STRIPE_ENTERPRISE_PRICE_ID=price_...
STRIPE_UNLIMITED_PRICE_ID=price_...
```

### 3. Database Schema Updates

The subscription tables are already in your schema, but ensure these columns exist:

```sql
-- Check if subscription-related columns exist in tenants table
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'active';
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS plan_type TEXT DEFAULT 'starter';

-- Ensure usage_tracking table exists (already defined in your schema)
-- This table tracks monthly usage for plan enforcement
```

### 4. Test the Integration

#### Test Checkout Flow
1. Go to `/pricing` on your application
2. Click "Get Started" on any plan
3. Complete the test checkout with card: `4242 4242 4242 4242`
4. Verify webhook receives the event
5. Check that tenant is updated with new plan

#### Test Plan Enforcement
1. Upload documents until you hit the limit
2. Verify you get a "402 Payment Required" response
3. Start conversations until you hit monthly limit
4. Verify upgrade prompts appear

### 5. Production Deployment

#### Switch to Live Mode
1. In Stripe Dashboard, toggle to **Live mode**
2. Create new products with live prices
3. Update webhook endpoint for production domain
4. Update environment variables with live keys

#### Security Checklist
- [ ] Webhook signature verification enabled
- [ ] HTTPS enforced on webhook endpoint
- [ ] Rate limiting on payment endpoints
- [ ] Error logging configured
- [ ] Test all plan upgrade/downgrade flows

## 🎯 Plan Enforcement Logic

### Document Limits
- **Free**: 5 documents
- **Starter**: 50 documents  
- **Professional**: 500 documents
- **Enterprise**: Unlimited
- **Unlimited**: Unlimited

### Conversation Limits (Monthly)
- **Free**: 50 conversations
- **Starter**: 500 conversations
- **Professional**: 5,000 conversations
- **Enterprise**: Unlimited
- **Unlimited**: Unlimited

### User Limits
- **Free**: 1 user
- **Starter**: 5 users
- **Professional**: 25 users
- **Enterprise**: 100 users
- **Unlimited**: Unlimited

## 🔧 API Endpoints

### Payment Endpoints
- `POST /api/stripe/checkout/session` - Create checkout session
- `POST /api/stripe/webhooks` - Handle Stripe webhooks
- `POST /api/stripe/portal` - Customer portal access

### Plan Enforcement
- Document upload automatically checks limits
- Conversation creation automatically checks limits
- User invitation automatically checks limits

## 🚨 Error Handling

### Common Error Codes
- `402 Payment Required` - Plan limit reached
- `401 Unauthorized` - Invalid authentication
- `403 Forbidden` - Insufficient permissions
- `500 Internal Server Error` - Payment processing failed

### Graceful Degradation
- If plan checking fails, users can still access the system
- Usage tracking failures don't block functionality
- Stripe API failures show user-friendly messages

## 📊 Monitoring

### Key Metrics to Track
- Subscription conversion rates
- Plan upgrade/downgrade frequency
- Usage by plan type
- Payment success/failure rates

### Stripe Dashboard
Monitor these sections regularly:
- **Payments** - Track successful/failed payments
- **Subscriptions** - Monitor plan changes
- **Webhooks** - Ensure events are processed
- **Disputes** - Handle chargebacks

## 🛠️ Troubleshooting

### Webhook Issues
```bash
# Test webhook locally with Stripe CLI
stripe listen --forward-to localhost:3000/api/stripe/webhooks
stripe trigger checkout.session.completed
```

### Database Issues
```sql
-- Check subscription status
SELECT t.subdomain, t.plan_type, t.subscription_status, s.status
FROM tenants t
LEFT JOIN subscriptions s ON t.id = s.tenant_id;

-- Check usage tracking
SELECT tenant_id, period_start, documents_count, conversations_count
FROM usage_tracking
ORDER BY period_start DESC;
```

### Plan Enforcement Issues
```javascript
// Test plan enforcement manually
const { enforceSubscriptionLimits } = require('./lib/plan-enforcement');
const result = await enforceSubscriptionLimits('tenant-id', 'document_upload');
console.log(result);
```

## 🎉 Success Criteria

Your Stripe integration is ready when:
- [ ] Users can successfully checkout and subscribe
- [ ] Webhooks update tenant plans automatically
- [ ] Plan limits are enforced on uploads/conversations
- [ ] Users see usage dashboard and upgrade prompts
- [ ] Failed payments are handled gracefully
- [ ] Production environment tested with live transactions

## 📞 Support

For issues with this integration:
1. Check Stripe Dashboard logs
2. Review application error logs
3. Verify environment variables
4. Test webhook delivery
5. Contact Stripe support for payment issues

---

**Next Steps**: Once Stripe is configured, test the full user journey from signup → trial → upgrade → billing management.

