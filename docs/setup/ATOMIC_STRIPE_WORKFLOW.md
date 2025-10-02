# ⚡ Atomic Stripe Integration Workflow
**DocsFlow Payment System - Step-by-Step Implementation**

---

## 🎯 Overview

**Current Status:** 60% Complete (Backend ✅ | Frontend ❌)  
**Time Required:** 8.5 hours (2 days)  
**Blockers:** None - Ready to start

---

## 📦 ATOMIC TASKS

Each task is self-contained and can be completed independently.

---

### ATOM 1: Stripe Dashboard Setup ⏱️ 30min 🔴

**Goal:** Configure Stripe products and webhooks

**Prerequisites:** Stripe account

**Steps:**
```bash
# 1. Go to Stripe Dashboard (Test Mode)
open https://dashboard.stripe.com/test/products

# 2. Create Products:
Product 1: "Starter Plan"
- Price: $29/month (recurring)
- Copy Price ID → STRIPE_STARTER_PRICE_ID

Product 2: "Professional Plan"  
- Price: $99/month (recurring)
- Copy Price ID → STRIPE_PROFESSIONAL_PRICE_ID

Product 3: "Enterprise Plan"
- Price: $299/month (recurring)
- Copy Price ID → STRIPE_ENTERPRISE_PRICE_ID

Product 4: "Unlimited Plan"
- Price: $999/month (recurring)
- Copy Price ID → STRIPE_UNLIMITED_PRICE_ID

# 3. Configure Webhook:
Go to: Developers → Webhooks → Add endpoint
URL: https://YOUR-DOMAIN.vercel.app/api/stripe/webhooks
Events to select:
- checkout.session.completed
- invoice.payment_succeeded
- invoice.payment_failed
- customer.subscription.updated
- customer.subscription.deleted

Copy Webhook Signing Secret → STRIPE_WEBHOOK_SECRET

# 4. Get API Keys:
Go to: Developers → API keys
Copy Secret Key → STRIPE_SECRET_KEY
Copy Publishable Key → NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
```

**Deliverable:** 
- ✅ 4 products created in Stripe
- ✅ Webhook configured
- ✅ 6 environment variables collected

**Next:** ATOM 2

---

### ATOM 2: Environment Configuration ⏱️ 15min 🔴

**Goal:** Set up environment variables

**Prerequisites:** ATOM 1 complete

**Local Setup:**
```bash
# Create .env.local file
cat > .env.local << EOF
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_YOUR_KEY_HERE
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_KEY_HERE
STRIPE_WEBHOOK_SECRET=whsec_YOUR_SECRET_HERE

# Stripe Price IDs
STRIPE_STARTER_PRICE_ID=price_YOUR_ID_HERE
STRIPE_PROFESSIONAL_PRICE_ID=price_YOUR_ID_HERE
STRIPE_ENTERPRISE_PRICE_ID=price_YOUR_ID_HERE
STRIPE_UNLIMITED_PRICE_ID=price_YOUR_ID_HERE
EOF

# Restart dev server
npm run dev
```

**Vercel Setup:**
```bash
# Add to Vercel dashboard
vercel env add STRIPE_SECRET_KEY
vercel env add NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
vercel env add STRIPE_WEBHOOK_SECRET
vercel env add STRIPE_STARTER_PRICE_ID
vercel env add STRIPE_PROFESSIONAL_PRICE_ID
vercel env add STRIPE_ENTERPRISE_PRICE_ID
vercel env add STRIPE_UNLIMITED_PRICE_ID

# Redeploy
vercel --prod
```

**Test:**
```bash
# Should not error
npm run build
```

**Deliverable:**
- ✅ .env.local created
- ✅ Vercel env vars set
- ✅ Build succeeds

**Next:** ATOM 3

---

### ATOM 3: Fix Pricing Page ⏱️ 45min 🟡

**Goal:** Make pricing page functional with real tenant ID

**File:** `app/pricing/page.tsx`

**Changes:**
```typescript
// BEFORE (line 1-41)
'use client';
import { useState } from 'react';

export default function PricingPage() {
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const handleUpgrade = async (planType: string) => {
    const tenantId = 'your-tenant-id'; // ❌ BROKEN
    // ...
  }
}

// AFTER
'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';

export default function PricingPage() {
  const { userId, isLoaded } = useAuth();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [currentPlan, setCurrentPlan] = useState<string>('free');

  useEffect(() => {
    if (!isLoaded) return;
    
    if (!userId) {
      router.push('/sign-in?redirect=/pricing');
      return;
    }

    // Fetch user's tenant
    async function getTenant() {
      try {
        const response = await fetch('/api/user/tenant');
        const data = await response.json();
        setTenantId(data.tenantId);
        setCurrentPlan(data.planType || 'free');
      } catch (error) {
        console.error('Error fetching tenant:', error);
      }
    }

    getTenant();
  }, [userId, isLoaded, router]);

  const handleUpgrade = async (planType: string) => {
    if (!tenantId) {
      alert('Please wait while we load your account...');
      return;
    }

    if (planType === currentPlan) {
      alert('You are already on this plan');
      return;
    }

    setIsLoading(planType);
    
    try {
      const response = await fetch('/api/stripe/checkout/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planType, tenantId }),
      });

      const data = await response.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        alert('Failed to start checkout. Please try again.');
      }
    } catch (error) {
      console.error('Error starting checkout:', error);
      alert('Something went wrong. Please try again.');
    } finally {
      setIsLoading(null);
    }
  };

  // Show loading state
  if (!isLoaded || !tenantId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    // ... rest of component (unchanged)
  );
}
```

**Also Update:** Line 53 - Change branding
```typescript
// BEFORE
<p className="text-xl text-slate-600 max-w-2xl mx-auto">
  Scale your AI-powered lead routing with plans designed for businesses of all sizes
</p>

// AFTER
<p className="text-xl text-slate-600 max-w-2xl mx-auto">
  Scale your document intelligence platform with plans designed for businesses of all sizes
</p>
```

**Deliverable:**
- ✅ Pricing page fetches real tenant ID
- ✅ Auth guard redirects to sign-in
- ✅ Shows current plan
- ✅ Checkout works

**Test:**
```bash
# Visit /pricing when logged in
# Click "Get Started"
# Should redirect to Stripe checkout
```

**Next:** ATOM 4

---

### ATOM 4: User Tenant API ⏱️ 20min 🟡

**Goal:** Create API to fetch user's tenant

**New File:** `app/api/user/tenant/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    // Get Clerk user
    const { userId } = auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get Supabase client
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

    // Get user's tenant
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('tenant_id')
      .eq('clerk_user_id', userId)
      .single();

    if (userError || !user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Get tenant details
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('id, subdomain, plan_type, subscription_status')
      .eq('id', user.tenant_id)
      .single();

    if (tenantError || !tenant) {
      return NextResponse.json(
        { error: 'Tenant not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      tenantId: tenant.id,
      subdomain: tenant.subdomain,
      planType: tenant.plan_type || 'free',
      subscriptionStatus: tenant.subscription_status || 'active',
    });

  } catch (error) {
    console.error('Error fetching tenant:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

**Deliverable:**
- ✅ API returns user's tenant info
- ✅ Pricing page can fetch tenant

**Test:**
```bash
curl http://localhost:3000/api/user/tenant \
  -H "Cookie: __session=YOUR_SESSION"
```

**Next:** ATOM 5

---

### ATOM 5: Upgrade Modal Component ⏱️ 1hour 🟡

**Goal:** Create reusable upgrade prompt

**New File:** `components/upgrade-modal.tsx`

```typescript
'use client';

import { useRouter } from 'next/navigation';
import { SUBSCRIPTION_PLANS } from '@/lib/tenant-limits';

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  feature: string;
  current: number;
  limit: number;
  currentPlan: string;
  message?: string;
}

export function UpgradeModal({
  isOpen,
  onClose,
  feature,
  current,
  limit,
  currentPlan,
  message
}: UpgradeModalProps) {
  const router = useRouter();

  if (!isOpen) return null;

  // Suggest next plan
  const suggestedPlan = 
    currentPlan === 'free' ? 'starter' :
    currentPlan === 'starter' ? 'professional' :
    'enterprise';

  const suggested = SUBSCRIPTION_PLANS[suggestedPlan];

  const handleUpgrade = () => {
    router.push(`/pricing?plan=${suggestedPlan}`);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Icon */}
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-yellow-100 mb-4">
            <svg className="h-6 w-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>

          {/* Content */}
          <div className="text-center mb-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Limit Reached
            </h3>
            <p className="text-gray-600 mb-4">
              {message || `You've reached your ${feature} limit`}
            </p>
            
            {/* Current Usage */}
            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <div className="text-sm text-gray-600 mb-1">Current Usage</div>
              <div className="text-2xl font-bold text-gray-900">
                {current} / {limit}
              </div>
              <div className="text-sm text-gray-500 mt-1">
                on {SUBSCRIPTION_PLANS[currentPlan]?.name || 'Free'} Plan
              </div>
            </div>

            {/* Upgrade Offer */}
            <div className="border-t border-gray-200 pt-4">
              <div className="text-sm font-medium text-gray-900 mb-2">
                Upgrade to {suggested.name}
              </div>
              <div className="text-3xl font-bold text-blue-600 mb-1">
                ${suggested.pricePerMonth}
                <span className="text-base font-normal text-gray-500">/month</span>
              </div>
              <div className="text-sm text-gray-600">
                Get {feature === 'documents' ? suggested.documentLimit : suggested.conversationLimit} {feature}/month
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
            >
              Maybe Later
            </button>
            <button
              onClick={handleUpgrade}
              className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors"
            >
              Upgrade Now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
```

**Deliverable:**
- ✅ Modal component created
- ✅ Responsive design
- ✅ Can be triggered from any page

**Test:**
```typescript
// Add to any page to test
const [showModal, setShowModal] = useState(true);

<UpgradeModal
  isOpen={showModal}
  onClose={() => setShowModal(false)}
  feature="documents"
  current={50}
  limit={50}
  currentPlan="starter"
  message="You've reached your document limit"
/>
```

**Next:** ATOM 6

---

### ATOM 6: Document Upload Error Handling ⏱️ 30min 🟡

**Goal:** Show upgrade modal when document limit reached

**File:** `app/dashboard/documents/page.tsx`

**Add to existing file:**
```typescript
// At top of file
import { UpgradeModal } from '@/components/upgrade-modal';

// Add state
const [showUpgradeModal, setShowUpgradeModal] = useState(false);
const [upgradeContext, setUpgradeContext] = useState<any>(null);
const [currentPlan, setCurrentPlan] = useState('free');

// Fetch current plan on mount
useEffect(() => {
  async function fetchPlan() {
    const res = await fetch('/api/user/tenant');
    const data = await res.json();
    setCurrentPlan(data.planType);
  }
  fetchPlan();
}, []);

// In your upload function, wrap the fetch:
async function handleUpload(file: File) {
  try {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch('/api/documents/upload', {
      method: 'POST',
      body: formData,
    });

    const data = await response.json();

    // Check for 402 Payment Required
    if (response.status === 402 && data.upgradeRequired) {
      setUpgradeContext({
        feature: 'documents',
        current: data.current,
        limit: data.limit,
        message: data.error,
      });
      setShowUpgradeModal(true);
      return; // Don't show generic error
    }

    if (!response.ok) {
      throw new Error(data.error || 'Upload failed');
    }

    // Handle success
    console.log('Upload successful:', data);
    
  } catch (error) {
    console.error('Upload error:', error);
    // Show generic error toast/message
  }
}

// In JSX, add modal at end
return (
  <div>
    {/* ... existing content ... */}
    
    {/* Upgrade Modal */}
    <UpgradeModal
      isOpen={showUpgradeModal}
      onClose={() => setShowUpgradeModal(false)}
      currentPlan={currentPlan}
      {...upgradeContext}
    />
  </div>
);
```

**Deliverable:**
- ✅ Document upload shows upgrade modal on limit
- ✅ User can upgrade or dismiss

**Test:**
```bash
# Upload documents until limit reached
# Should see modal instead of error toast
```

**Next:** ATOM 7

---

### ATOM 7: Chat Error Handling ⏱️ 30min 🟡

**Goal:** Show upgrade modal when conversation limit reached

**File:** `app/dashboard/chat/page.tsx`

**Same pattern as ATOM 6:**
```typescript
// Add imports, state, and modal
import { UpgradeModal } from '@/components/upgrade-modal';

// Wrap chat API call
async function sendMessage(message: string) {
  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, conversationId }),
    });

    const data = await response.json();

    if (response.status === 402 && data.upgradeRequired) {
      setUpgradeContext({
        feature: 'conversations',
        current: data.current,
        limit: data.limit,
        message: data.error,
      });
      setShowUpgradeModal(true);
      return;
    }

    // Handle success
  } catch (error) {
    // Handle error
  }
}

// Add modal to JSX
<UpgradeModal ... />
```

**Deliverable:**
- ✅ Chat shows upgrade modal on limit
- ✅ Consistent UX across features

**Next:** ATOM 8

---

### ATOM 8: Billing Dashboard Page ⏱️ 2hours 🔴

**Goal:** Full billing management interface

**New File:** `app/dashboard/billing/page.tsx`

```typescript
'use client';

import { useEffect, useState } from 'react';
import { UsageDashboard } from '@/components/usage-dashboard';
import { SUBSCRIPTION_PLANS } from '@/lib/tenant-limits';

export default function BillingPage() {
  const [tenant, setTenant] = useState<any>(null);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch tenant info
        const tenantRes = await fetch('/api/user/tenant');
        const tenantData = await tenantRes.json();
        setTenant(tenantData);

        // Fetch invoices
        const invoicesRes = await fetch('/api/billing/invoices');
        const invoicesData = await invoicesRes.json();
        setInvoices(invoicesData.invoices || []);
      } catch (error) {
        console.error('Error fetching billing data:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  const handleOpenPortal = async () => {
    try {
      const response = await fetch('/api/stripe/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ returnUrl: window.location.href }),
      });

      const { url } = await response.json();
      window.open(url, '_blank');
    } catch (error) {
      console.error('Error opening portal:', error);
      alert('Failed to open billing portal');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  const plan = SUBSCRIPTION_PLANS[tenant?.planType || 'free'];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Billing & Usage</h1>
        <p className="text-gray-600 mt-2">
          Manage your subscription and track your usage
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Current Plan Card */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  Current Plan
                </h2>
                <p className="text-gray-600 text-sm mt-1">
                  {tenant?.subscriptionStatus === 'active' ? 'Active' : 'Inactive'}
                </p>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold text-gray-900">
                  ${plan.pricePerMonth}
                </div>
                <div className="text-sm text-gray-600">per month</div>
              </div>
            </div>

            <div className="border-t border-gray-200 pt-6 mb-6">
              <h3 className="font-semibold text-gray-900 mb-3">
                {plan.name} Plan
              </h3>
              <ul className="space-y-2">
                {plan.features.map((feature: string, i: number) => (
                  <li key={i} className="flex items-center text-gray-700">
                    <svg className="w-5 h-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    {feature}
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex gap-3">
              <a
                href="/pricing"
                className="flex-1 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-center font-medium transition-colors"
              >
                {tenant?.planType === 'free' ? 'Upgrade Plan' : 'Change Plan'}
              </a>
              <button
                onClick={handleOpenPortal}
                className="flex-1 border border-gray-300 hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-lg font-medium transition-colors"
              >
                Manage in Stripe
              </button>
            </div>
          </div>

          {/* Invoices */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">
              Billing History
            </h2>

            {invoices.length === 0 ? (
              <p className="text-gray-600 text-center py-8">
                No invoices yet
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 font-medium text-gray-700">Date</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700">Amount</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700">Status</th>
                      <th className="text-right py-3 px-4 font-medium text-gray-700">Invoice</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.map((invoice: any) => (
                      <tr key={invoice.id} className="border-b border-gray-100">
                        <td className="py-3 px-4 text-gray-900">
                          {new Date(invoice.created * 1000).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4 text-gray-900">
                          ${(invoice.amount_paid / 100).toFixed(2)}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                            invoice.status === 'paid' 
                              ? 'bg-green-100 text-green-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {invoice.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <a
                            href={invoice.hosted_invoice_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-500 hover:text-blue-600 text-sm font-medium"
                          >
                            View →
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar - Usage Dashboard */}
        <div className="lg:col-span-1">
          <UsageDashboard 
            tenantId={tenant?.tenantId} 
            planType={tenant?.planType || 'free'} 
          />
        </div>
      </div>
    </div>
  );
}
```

**Deliverable:**
- ✅ Billing dashboard page
- ✅ Shows current plan
- ✅ Shows usage
- ✅ Links to portal
- ✅ Shows invoice history

**Next:** ATOM 9

---

### ATOM 9: Billing Invoices API ⏱️ 30min 🟢

**Goal:** Fetch Stripe invoices for user

**New File:** `app/api/billing/invoices/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { stripe } from '@/lib/stripe-client';

export async function GET(request: NextRequest) {
  try {
    const { userId } = auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's subscription
    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
          set() {},
          remove() {},
        },
      }
    );

    // Get user's tenant
    const { data: user } = await supabase
      .from('users')
      .select('tenant_id')
      .eq('clerk_user_id', userId)
      .single();

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get subscription
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('tenant_id', user.tenant_id)
      .single();

    if (!subscription?.stripe_customer_id) {
      return NextResponse.json({ invoices: [] });
    }

    // Fetch invoices from Stripe
    const invoices = await stripe.invoices.list({
      customer: subscription.stripe_customer_id,
      limit: 12,
    });

    return NextResponse.json({
      invoices: invoices.data,
    });

  } catch (error) {
    console.error('Error fetching invoices:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

**Deliverable:**
- ✅ API returns user's invoices
- ✅ Billing page can display them

**Next:** ATOM 10

---

### ATOM 10: Customer Portal API ⏱️ 20min 🟢

**Goal:** Create Stripe portal session

**New File:** `app/api/stripe/portal/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { stripe } from '@/lib/stripe-client';

export async function POST(request: NextRequest) {
  try {
    const { userId } = auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { returnUrl } = await request.json();

    // Get user's subscription
    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
          set() {},
          remove() {},
        },
      }
    );

    // Get user's tenant
    const { data: user } = await supabase
      .from('users')
      .select('tenant_id')
      .eq('clerk_user_id', userId)
      .single();

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get subscription
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('tenant_id', user.tenant_id)
      .single();

    if (!subscription?.stripe_customer_id) {
      return NextResponse.json(
        { error: 'No active subscription' },
        { status: 404 }
      );
    }

    // Create portal session
    const session = await stripe.billingPortal.sessions.create({
      customer: subscription.stripe_customer_id,
      return_url: returnUrl || `${request.nextUrl.origin}/dashboard/billing`,
    });

    return NextResponse.json({ url: session.url });

  } catch (error) {
    console.error('Error creating portal session:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

**Deliverable:**
- ✅ Portal opens for users
- ✅ Users can manage payment methods

**Next:** ATOM 11

---

### ATOM 11: Success Page ⏱️ 25min 🟢

**Goal:** Post-checkout success page

**New File:** `app/billing/success/page.tsx`

```typescript
'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

export default function CheckoutSuccess() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<any>(null);

  useEffect(() => {
    if (sessionId) {
      // Optionally verify session
      setLoading(false);
    }
  }, [sessionId]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
        {/* Success Icon */}
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 mb-6">
          <svg className="h-10 w-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>

        {/* Title */}
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          Welcome Aboard! 🎉
        </h1>

        <p className="text-gray-600 mb-8">
          Your subscription has been activated successfully. You now have access to all premium features.
        </p>

        {/* What's Next */}
        <div className="bg-gray-50 rounded-lg p-6 mb-8 text-left">
          <h2 className="font-semibold text-gray-900 mb-3">What's Next?</h2>
          <ul className="space-y-2 text-sm text-gray-700">
            <li className="flex items-start">
              <span className="text-blue-500 mr-2">✓</span>
              Upload your documents and start analyzing
            </li>
            <li className="flex items-start">
              <span className="text-blue-500 mr-2">✓</span>
              Invite team members to collaborate
            </li>
            <li className="flex items-start">
              <span className="text-blue-500 mr-2">✓</span>
              Explore advanced AI features
            </li>
          </ul>
        </div>

        {/* CTA */}
        <div className="space-y-3">
          <Link
            href="/dashboard"
            className="block w-full bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg font-medium transition-colors"
          >
            Go to Dashboard
          </Link>
          <Link
            href="/dashboard/billing"
            className="block w-full border border-gray-300 hover:bg-gray-50 text-gray-700 px-6 py-3 rounded-lg font-medium transition-colors"
          >
            View Billing
          </Link>
        </div>
      </div>
    </div>
  );
}
```

**Deliverable:**
- ✅ Success page created
- ✅ User redirected after payment

**Next:** ATOM 12

---

### ATOM 12: Cancel Page ⏱️ 20min 🟢

**Goal:** Handle checkout cancellation

**New File:** `app/billing/cancel/page.tsx`

```typescript
'use client';

import Link from 'next/link';

export default function CheckoutCancel() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
        {/* Icon */}
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 mb-6">
          <svg className="h-10 w-10 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          Checkout Cancelled
        </h1>

        <p className="text-gray-600 mb-8">
          No worries! Your checkout was cancelled and no charges were made.
        </p>

        {/* Options */}
        <div className="space-y-3">
          <Link
            href="/pricing"
            className="block w-full bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg font-medium transition-colors"
          >
            Try Again
          </Link>
          <Link
            href="/dashboard"
            className="block w-full border border-gray-300 hover:bg-gray-50 text-gray-700 px-6 py-3 rounded-lg font-medium transition-colors"
          >
            Back to Dashboard
          </Link>
        </div>

        {/* Support */}
        <div className="mt-8 pt-6 border-t border-gray-200">
          <p className="text-sm text-gray-600 mb-2">
            Need help choosing a plan?
          </p>
          <Link
            href="/dashboard/support"
            className="text-blue-500 hover:text-blue-600 font-medium text-sm"
          >
            Contact Support →
          </Link>
        </div>
      </div>
    </div>
  );
}
```

**Deliverable:**
- ✅ Cancel page created
- ✅ User can retry or return

**Next:** ATOM 13

---

### ATOM 13: End-to-End Testing ⏱️ 1hour 🔵

**Goal:** Test complete payment flow

**Test Checklist:**

```bash
# 1. Environment Check (5 mins)
✓ .env.local has all Stripe keys
✓ Vercel has all env vars
✓ Stripe webhook is active

# 2. Signup Flow (10 mins)
✓ New user signs up
✓ Automatically on Free plan
✓ Can view dashboard
✓ Usage dashboard shows 0/5 documents

# 3. Free Tier Limits (10 mins)
✓ Upload 5 documents → Success
✓ Try 6th document → See upgrade modal
✓ Modal shows correct limits
✓ Can dismiss or upgrade

# 4. Upgrade Flow (15 mins)
✓ Click "Upgrade Now" in modal
✓ Redirected to pricing page
✓ Click "Get Started" on Starter
✓ Stripe checkout opens
✓ Use test card: 4242 4242 4242 4242
✓ Complete checkout
✓ Redirected to success page
✓ Plan updated in database
✓ Usage limits increased

# 5. Post-Upgrade (10 mins)
✓ Can now upload more documents
✓ Usage dashboard shows new limits
✓ Billing page shows active subscription
✓ Invoice appears in history

# 6. Billing Dashboard (10 mins)
✓ Shows current plan correctly
✓ "Manage in Stripe" opens portal
✓ Can view invoice PDFs
✓ All numbers are correct

# 7. Webhook Processing (10 mins)
# Use Stripe CLI
stripe listen --forward-to localhost:3000/api/stripe/webhooks

# Trigger events
stripe trigger checkout.session.completed
✓ Check database - subscription created

stripe trigger invoice.payment_succeeded
✓ Check database - status updated

stripe trigger customer.subscription.updated
✓ Check database - updated

stripe trigger customer.subscription.deleted
✓ Check database - cancelled

# 8. Error Scenarios (10 mins)
✓ Invalid card → Error shown, not charged
✓ Webhook fails → Logged, subscription not created
✓ API down → User sees error message
✓ Double-click → Only one charge
```

**Test Card Numbers:**
```
Success: 4242 4242 4242 4242
Declined: 4000 0000 0000 0002
3D Secure: 4000 0025 0000 3155
```

**Deliverable:**
- ✅ All test cases pass
- ✅ No errors in logs
- ✅ Ready for production

**Next:** ATOM 14

---

### ATOM 14: Production Deployment ⏱️ 30min 🟣

**Goal:** Launch to production

**Steps:**

```bash
# 1. Create Live Products in Stripe (10 mins)
# Switch to Live mode in Stripe dashboard
# Create same 4 products with live prices
# Copy new live Price IDs

# 2. Update Environment Variables (10 mins)
# In Vercel dashboard, update:
STRIPE_SECRET_KEY=sk_live_YOUR_KEY
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_YOUR_KEY
STRIPE_WEBHOOK_SECRET=whsec_live_YOUR_SECRET
STRIPE_STARTER_PRICE_ID=price_live_...
STRIPE_PROFESSIONAL_PRICE_ID=price_live_...
STRIPE_ENTERPRISE_PRICE_ID=price_live_...
STRIPE_UNLIMITED_PRICE_ID=price_live_...

# 3. Configure Live Webhook (5 mins)
# In Stripe → Webhooks → Add endpoint
# URL: https://docsflow.app/api/stripe/webhooks
# Select same events
# Copy webhook secret → Update Vercel env

# 4. Deploy (5 mins)
git add .
git commit -m "🚀 Launch: Complete Stripe payment integration"
git push origin main

# Auto-deploys to Vercel

# 5. Verify (5 mins after deploy)
# Visit https://docsflow.app/pricing
# Test with live card (small amount)
# Immediately refund test transaction
```

**Deliverable:**
- ✅ Live in production
- ✅ Webhook working
- ✅ Test transaction successful

**DONE!** 🎉

---

## 📊 PROGRESS TRACKING

Use this to track your progress:

```
Setup & Config:
[ ] ATOM 1: Stripe Dashboard Setup (30min)
[ ] ATOM 2: Environment Config (15min)

Frontend - Core:
[ ] ATOM 3: Fix Pricing Page (45min)
[ ] ATOM 4: User Tenant API (20min)
[ ] ATOM 5: Upgrade Modal (1hr)

Frontend - Error Handling:
[ ] ATOM 6: Document Upload Errors (30min)
[ ] ATOM 7: Chat Errors (30min)

Frontend - Billing:
[ ] ATOM 8: Billing Dashboard (2hrs)
[ ] ATOM 9: Billing Invoices API (30min)
[ ] ATOM 10: Customer Portal API (20min)
[ ] ATOM 11: Success Page (25min)
[ ] ATOM 12: Cancel Page (20min)

QA & Launch:
[ ] ATOM 13: Testing (1hr)
[ ] ATOM 14: Production Deploy (30min)

Total: 8.5 hours
```

---

## 🆘 TROUBLESHOOTING

**Problem:** Webhook not receiving events  
**Solution:** Check Stripe dashboard logs, verify URL, test with CLI

**Problem:** Checkout fails  
**Solution:** Check browser console, verify API keys, check Stripe logs

**Problem:** Plan not updating after payment  
**Solution:** Check webhook handler, verify database permissions

**Problem:** Modal not showing  
**Solution:** Check 402 response in Network tab, verify error handling

---

## 🎉 COMPLETION CRITERIA

You're done when:
- ✅ Users can upgrade from any plan
- ✅ Upgrade modal shows on limits
- ✅ Billing dashboard works
- ✅ Webhooks process correctly
- ✅ All tests pass
- ✅ Deployed to production

**Next:** Monitor conversions, gather feedback, iterate!

