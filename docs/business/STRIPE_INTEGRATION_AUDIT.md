# 🔍 Complete Stripe Integration Audit - DocsFlow
**Date:** October 1, 2025  
**System:** DocsFlow - Multi-tenant Document Intelligence Platform  
**Status:** 🟡 60% COMPLETE

---

## 📊 Executive Summary

**Current State:** Stripe backend integration is **60% complete**. Backend logic works but lacks:
- Frontend UI for billing management
- Upgrade prompts/modals
- Environment configuration
- Error handling for limit exceeded scenarios

**Estimated Time to Complete:** 2-3 days  
**Risk Level:** LOW (no blocking issues, just missing UI)

---

## ✅ WHAT EXISTS (Backend - 60% Complete)

### 1. **Stripe API Integration** ✅
- **Location:** `app/api/stripe/`
- **Status:** Fully implemented

| Component | File | Status |
|-----------|------|--------|
| Checkout Session | `app/api/stripe/checkout/session/route.ts` | ✅ Complete |
| Webhooks Handler | `app/api/stripe/webhooks/route.ts` | ✅ Complete |
| Stripe Client | `lib/stripe-client.ts` | ✅ Complete |

**Features:**
- ✅ Create checkout sessions
- ✅ Handle subscription events
- ✅ Process payments
- ✅ Update subscription status
- ✅ Cancel subscriptions

### 2. **Plan Enforcement** ✅
- **Location:** `lib/plan-enforcement.ts`
- **Status:** Fully implemented (just fixed usage tracking)

**Features:**
- ✅ Check document limits
- ✅ Check conversation limits
- ✅ Check user limits
- ✅ Track usage (FIXED TODAY)
- ✅ Return 402 errors with upgrade info

**Example Response When Limit Reached:**
```json
{
  "error": "Document upload limit reached (50/50)",
  "upgradeRequired": true,
  "current": 50,
  "limit": 50
}
```

### 3. **Pricing Page** ⚠️
- **Location:** `app/pricing/page.tsx`
- **Status:** 80% complete

**Exists:**
- ✅ Beautiful UI with all plans
- ✅ Feature comparison
- ✅ FAQ section
- ✅ Checkout integration

**Issues:**
- ❌ Hardcoded tenant ID: `const tenantId = 'your-tenant-id';`
- ❌ Not using auth context
- ❌ Wrong branding (mentions "AI Lead Router")

### 4. **Usage Dashboard Component** ⚠️
- **Location:** `components/usage-dashboard.tsx`
- **Status:** 90% complete

**Features:**
- ✅ Shows current usage vs limits
- ✅ Progress bars with color coding
- ✅ Warning at 75% usage
- ✅ "Upgrade Plan" button
- ✅ Links to billing page

**Issue:**
- ⚠️ Links to `/billing` which doesn't exist yet

### 5. **Database Schema** ✅
- **Status:** Complete

**Tables:**
- ✅ `subscriptions` - Stripe subscription data
- ✅ `usage_tracking` - Monthly usage (CREATED TODAY)
- ✅ `tenants` - Has plan_type and subscription_status

---

## ❌ WHAT'S MISSING (Frontend - 40%)

### 1. **Billing Dashboard Page** ❌ CRITICAL
- **Expected Location:** `app/dashboard/billing/page.tsx`
- **Status:** Does not exist

**Needed Features:**
- Current plan display
- Subscription status
- Payment method
- Invoice history
- Upgrade/downgrade buttons
- Cancel subscription button
- Customer portal link

### 2. **Upgrade Modal/Popup** ❌ CRITICAL
- **Expected Location:** `components/upgrade-modal.tsx`
- **Status:** Does not exist

**Needed Features:**
- Triggered when API returns 402 error
- Shows current limit vs usage
- Compare plans side-by-side
- Direct upgrade button
- Close/dismiss option

### 3. **Frontend Error Handling** ❌ CRITICAL
- **Locations:** Document upload, Chat, Conversations
- **Status:** Missing 402 error handling

**Current Behavior:**
- API returns 402 with `upgradeRequired: true`
- Frontend likely shows generic error
- No upgrade prompt displayed

**Needed Behavior:**
```typescript
// In document upload component
try {
  const response = await fetch('/api/documents/upload', {...});
  const data = await response.json();
  
  if (response.status === 402 && data.upgradeRequired) {
    // Show upgrade modal
    setShowUpgradeModal(true);
    setUpgradeContext({
      feature: 'documents',
      current: data.current,
      limit: data.limit,
      message: data.error
    });
  }
} catch (error) {
  // Handle error
}
```

### 4. **Checkout Success/Cancel Pages** ❌
- **Expected Locations:** 
  - `app/billing/success/page.tsx`
  - `app/billing/cancel/page.tsx`
- **Status:** Do not exist

**Needed:**
- Success page: Confirm subscription, show next steps
- Cancel page: Allow retry, show support options

### 5. **Environment Variables** ❌ CRITICAL
- **File:** `.env.local` (not in repo, needs manual setup)
- **Status:** Not configured

**Required Variables:**
```bash
# Stripe Keys
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Stripe Price IDs (create products first)
STRIPE_STARTER_PRICE_ID=price_...
STRIPE_PROFESSIONAL_PRICE_ID=price_...
STRIPE_ENTERPRISE_PRICE_ID=price_...
STRIPE_UNLIMITED_PRICE_ID=price_...
```

### 6. **Stripe Dashboard Setup** ❌
- **Status:** Not configured

**Steps Required:**
1. Create products in Stripe
2. Create price IDs
3. Configure webhook endpoint
4. Test webhook delivery

### 7. **Customer Portal Integration** ❌
- **API Route:** Exists in `lib/stripe-client.ts`
- **Frontend:** No button/link to trigger it

**Needed:**
- Button in billing dashboard
- Opens Stripe Customer Portal
- Users can manage subscription directly

---

## 🎯 WHAT WORKS vs WHAT DOESN'T

### ✅ What Works RIGHT NOW:
1. **Backend limit checking** - APIs return 402 correctly
2. **Usage tracking** - Now working after fix
3. **Stripe webhooks** - Will process events when configured
4. **Checkout flow** - Backend creates sessions correctly
5. **Plan limits** - Enforced at API level

### ❌ What Doesn't Work:
1. **Users can't upgrade** - No UI to trigger upgrade
2. **No billing management** - No page to view/manage subscription
3. **Poor UX on limits** - Errors shown but no upgrade path
4. **Stripe not connected** - Missing API keys
5. **No products** - Stripe dashboard not set up

---

## 🔧 DETAILED COMPONENT ANALYSIS

### Component 1: Pricing Page
**File:** `app/pricing/page.tsx`

**Critical Issue:**
```typescript
// LINE 14 - BROKEN
const tenantId = 'your-tenant-id'; // ❌ HARDCODED
```

**Fix Required:**
```typescript
// Use Clerk/auth context
import { useAuth } from '@clerk/nextjs';

export default function PricingPage() {
  const { userId } = useAuth();
  const [tenantId, setTenantId] = useState<string | null>(null);
  
  useEffect(() => {
    // Fetch user's tenant
    async function getTenant() {
      const res = await fetch('/api/user/tenant');
      const data = await res.json();
      setTenantId(data.tenantId);
    }
    getTenant();
  }, [userId]);
  
  // ... rest of component
}
```

**Also Fix:**
- Line 53: Change "AI-powered lead routing" to "Document intelligence"
- Update plan descriptions to match DocsFlow features

---

### Component 2: Usage Dashboard
**File:** `components/usage-dashboard.tsx`

**Issue:**
```typescript
// LINE 189 - BROKEN LINK
<a href="/billing" ...>
  Manage Billing
</a>
```

**Fix:** Create the billing page first, then this link will work.

---

### Component 3: API Error Responses
**Files:** `app/api/documents/upload/route.ts`, `app/api/chat/route.ts`, etc.

**Current Behavior (GOOD):**
```typescript
// LINE 115
return NextResponse.json({
  error: limitCheck.message || 'Document upload limit reached',
  upgradeRequired: limitCheck.upgradeRequired,
  current: limitCheck.current,
  limit: limitCheck.limit
}, { status: 402 });
```

**Missing:** Frontend handling of this response.

---

## 🎬 ATOMIC WORKFLOW PLAN

### Phase 1: Environment Setup (30 mins) 🔴
**Goal:** Configure Stripe and create products

**Steps:**
1. [ ] **Create Stripe Products** (15 mins)
   - Go to https://dashboard.stripe.com/test/products
   - Create 4 products:
     - Starter: $29/month
     - Professional: $99/month
     - Enterprise: $299/month
     - Unlimited: $999/month
   - Copy all Price IDs

2. [ ] **Configure Webhook** (10 mins)
   - Go to Developers → Webhooks
   - Add endpoint: `https://yourdomain.vercel.app/api/stripe/webhooks`
   - Select events:
     - `checkout.session.completed`
     - `invoice.payment_succeeded`
     - `invoice.payment_failed`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
   - Copy webhook signing secret

3. [ ] **Set Environment Variables** (5 mins)
   - Create `.env.local` file
   - Add Stripe keys (from Stripe dashboard)
   - Add Price IDs (from step 1)
   - Add webhook secret (from step 2)
   - Deploy to Vercel (add env vars there too)

**Testing:**
```bash
# Test webhook locally
stripe listen --forward-to localhost:3000/api/stripe/webhooks
stripe trigger checkout.session.completed
```

---

### Phase 2: Fix Pricing Page (45 mins) 🟡
**Goal:** Make pricing page functional

**File:** `app/pricing/page.tsx`

**Tasks:**
1. [ ] **Fix tenant ID fetching** (15 mins)
   - Replace hardcoded ID with auth context
   - Add loading state
   - Handle errors

2. [ ] **Update branding** (10 mins)
   - Change "AI Lead Router" → "DocsFlow"
   - Update descriptions for document intelligence
   - Update feature lists

3. [ ] **Add auth guard** (10 mins)
   - Redirect unauthenticated users to signin
   - Show current plan if already subscribed

4. [ ] **Test checkout flow** (10 mins)
   - Click each plan
   - Verify Stripe checkout opens
   - Test with test card: 4242 4242 4242 4242

**Acceptance Criteria:**
- ✅ Authenticated users can click "Get Started"
- ✅ Redirects to Stripe checkout
- ✅ Returns to app after payment
- ✅ Subscription updated in database

---

### Phase 3: Create Upgrade Modal (1 hour) 🟡
**Goal:** Build reusable upgrade prompt component

**New File:** `components/upgrade-modal.tsx`

**Features:**
1. [ ] **Modal UI** (30 mins)
   - Overlay with blur background
   - Card with current vs required plan
   - "Upgrade Now" and "Cancel" buttons
   - Plan comparison table

2. [ ] **Integration** (20 mins)
   - Accept props: feature, current, limit, message
   - Link to pricing page with selected plan
   - Track modal open/close state

3. [ ] **Styling** (10 mins)
   - Match DocsFlow design system
   - Mobile responsive
   - Smooth animations

**Component API:**
```typescript
<UpgradeModal
  isOpen={showUpgradeModal}
  onClose={() => setShowUpgradeModal(false)}
  feature="documents"
  current={50}
  limit={50}
  currentPlan="starter"
  suggestedPlan="professional"
  message="You've reached your document limit"
/>
```

---

### Phase 4: Add Error Handling (1.5 hours) 🟡
**Goal:** Catch 402 errors and show upgrade modal

**Files to Update:**
1. `app/dashboard/documents/page.tsx` - Document upload
2. `app/dashboard/chat/page.tsx` - Chat interface
3. Any other components that hit rate limits

**Implementation for Each:**
```typescript
// 1. Add state (5 mins per file)
const [showUpgradeModal, setShowUpgradeModal] = useState(false);
const [upgradeContext, setUpgradeContext] = useState(null);

// 2. Wrap API calls (10 mins per file)
try {
  const response = await fetch('/api/documents/upload', {...});
  const data = await response.json();
  
  if (response.status === 402 && data.upgradeRequired) {
    setUpgradeContext({
      feature: 'documents',
      current: data.current,
      limit: data.limit,
      message: data.error
    });
    setShowUpgradeModal(true);
    return; // Don't show generic error
  }
  
  if (!response.ok) {
    throw new Error(data.error);
  }
  
  // Handle success
} catch (error) {
  // Handle other errors
}

// 3. Add modal to JSX (5 mins per file)
<UpgradeModal
  isOpen={showUpgradeModal}
  onClose={() => setShowUpgradeModal(false)}
  {...upgradeContext}
/>
```

**Files Affected:**
- `app/dashboard/documents/page.tsx` (30 mins)
- `app/dashboard/chat/page.tsx` (30 mins)
- Any conversation creation (30 mins)

---

### Phase 5: Create Billing Dashboard (2 hours) 🔴
**Goal:** Full-featured billing management page

**New File:** `app/dashboard/billing/page.tsx`

**Sections:**

1. [ ] **Current Plan Card** (30 mins)
   ```
   ┌─────────────────────────────┐
   │ Professional Plan           │
   │ $99/month                   │
   │ Active • Renews Dec 1, 2025 │
   │ [Manage in Stripe Portal]   │
   └─────────────────────────────┘
   ```

2. [ ] **Usage Overview** (20 mins)
   - Reuse `<UsageDashboard />` component
   - Show current usage vs plan limits

3. [ ] **Billing History** (40 mins)
   - Fetch invoices from Stripe
   - Display table: Date, Amount, Status, Download
   - Pagination if needed

4. [ ] **Plan Actions** (30 mins)
   - "Upgrade Plan" button → /pricing
   - "Downgrade Plan" dropdown
   - "Cancel Subscription" button (with confirmation)
   - "Update Payment Method" → Stripe Portal

**API Routes Needed:**
```typescript
// app/api/billing/invoices/route.ts
export async function GET(request: NextRequest) {
  // Fetch Stripe invoices for customer
  // Return as JSON
}

// app/api/stripe/portal/route.ts  
export async function POST(request: NextRequest) {
  // Create Stripe customer portal session
  // Return portal URL
}
```

---

### Phase 6: Success/Cancel Pages (45 mins) 🟢
**Goal:** Handle post-checkout redirects

**File 1:** `app/billing/success/page.tsx` (25 mins)

**Features:**
- ✅ Success message
- Show new plan details
- "Go to Dashboard" button
- Track conversion event

**File 2:** `app/billing/cancel/page.tsx` (20 mins)

**Features:**
- Explain what happened
- "Try Again" button → /pricing
- "Contact Support" link
- Offer alternative (annual billing discount)

---

### Phase 7: Customer Portal Integration (30 mins) 🟢
**Goal:** Let users manage subscriptions via Stripe

**Tasks:**
1. [ ] **Create Portal Route** (15 mins)
   - File: `app/api/stripe/portal/route.ts`
   - Use `createPortalSession()` from stripe-client
   - Return portal URL

2. [ ] **Add Portal Button** (15 mins)
   - In billing dashboard
   - "Manage Payment Method" button
   - Opens Stripe portal in new tab

**Implementation:**
```typescript
// In billing page
const handleOpenPortal = async () => {
  const response = await fetch('/api/stripe/portal', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ returnUrl: window.location.href })
  });
  
  const { url } = await response.json();
  window.open(url, '_blank');
};
```

---

### Phase 8: Testing & QA (1 hour) 🔵
**Goal:** Comprehensive testing of payment flow

**Test Cases:**

1. [ ] **Signup Flow** (15 mins)
   - New user signs up
   - Starts on Free plan
   - Can access free tier features
   - Sees usage dashboard

2. [ ] **Upgrade Flow** (15 mins)
   - User hits document limit
   - Sees upgrade modal
   - Clicks "Upgrade Now"
   - Completes checkout
   - Redirected to success page
   - Plan updated in database
   - New limits applied immediately

3. [ ] **Limit Enforcement** (10 mins)
   - Free user: Try to upload 6th document → blocked
   - Starter user: Try to create 501st conversation → blocked
   - Professional user: Upload 200 documents → works
   - Verify correct error messages

4. [ ] **Billing Management** (10 mins)
   - View billing dashboard
   - See current usage
   - View invoice history
   - Open customer portal
   - Update payment method (in portal)
   - Return to app

5. [ ] **Webhook Processing** (10 mins)
   - Use Stripe CLI to trigger events
   - Verify database updates
   - Check logs for errors

**Testing Checklist:**
```bash
# Stripe CLI setup
stripe login
stripe listen --forward-to localhost:3000/api/stripe/webhooks

# Trigger test events
stripe trigger checkout.session.completed
stripe trigger invoice.payment_succeeded
stripe trigger customer.subscription.updated
stripe trigger customer.subscription.deleted

# Verify in database
SELECT * FROM subscriptions ORDER BY created_at DESC LIMIT 5;
SELECT * FROM usage_tracking ORDER BY created_at DESC LIMIT 5;
```

---

### Phase 9: Production Deployment (30 mins) 🟣
**Goal:** Launch to production

**Steps:**
1. [ ] **Switch to Live Mode** (10 mins)
   - Create live products in Stripe
   - Get live API keys
   - Update Vercel env vars

2. [ ] **Configure Live Webhook** (5 mins)
   - Use production domain
   - Test webhook delivery

3. [ ] **Update Pricing** (5 mins)
   - Review final pricing
   - Update pricing page
   - Deploy changes

4. [ ] **Announcement** (10 mins)
   - Email existing users about paid plans
   - Update website/docs
   - Social media announcement

---

## 📋 COMPLETE CHECKLIST

### Setup (30 mins)
- [ ] Create Stripe test products
- [ ] Configure webhook endpoint
- [ ] Set environment variables locally
- [ ] Set environment variables on Vercel
- [ ] Test webhook with Stripe CLI

### Frontend (5 hours)
- [ ] Fix pricing page tenant ID
- [ ] Update pricing page branding
- [ ] Create upgrade modal component
- [ ] Add error handling to document upload
- [ ] Add error handling to chat
- [ ] Add error handling to conversations
- [ ] Create billing dashboard page
- [ ] Create billing/success page
- [ ] Create billing/cancel page
- [ ] Add customer portal button

### Backend (1 hour)
- [ ] Create billing/invoices API route
- [ ] Create stripe/portal API route
- [ ] Test all webhook handlers
- [ ] Verify usage tracking works

### Testing (1 hour)
- [ ] Test signup flow
- [ ] Test upgrade flow (each plan)
- [ ] Test limit enforcement
- [ ] Test billing dashboard
- [ ] Test webhook events
- [ ] Test customer portal

### Production (30 mins)
- [ ] Create live Stripe products
- [ ] Deploy with live keys
- [ ] Configure live webhook
- [ ] Test one real transaction (refund after)
- [ ] Announce launch

---

## ⏱️ TIME ESTIMATES

| Phase | Duration | Priority |
|-------|----------|----------|
| Environment Setup | 30 mins | 🔴 Critical |
| Fix Pricing Page | 45 mins | 🟡 High |
| Upgrade Modal | 1 hour | 🟡 High |
| Error Handling | 1.5 hours | 🟡 High |
| Billing Dashboard | 2 hours | 🔴 Critical |
| Success/Cancel Pages | 45 mins | 🟢 Medium |
| Customer Portal | 30 mins | 🟢 Medium |
| Testing | 1 hour | 🔵 High |
| Production Deploy | 30 mins | 🟣 Critical |

**Total:** ~8.5 hours (~2 working days)

---

## 🎯 RECOMMENDED EXECUTION ORDER

### Day 1 (4 hours)
**Morning:**
1. Environment Setup (30 mins)
2. Fix Pricing Page (45 mins)
3. Create Upgrade Modal (1 hour)
4. Add Error Handling (1.5 hours)

**Afternoon:**
5. Create Billing Dashboard (2 hours)

**End of Day 1:** Users can upgrade when they hit limits

---

### Day 2 (4.5 hours)
**Morning:**
1. Success/Cancel Pages (45 mins)
2. Customer Portal (30 mins)
3. Testing (1 hour)

**Afternoon:**
4. Production Setup (30 mins)
5. Buffer for fixes/polish (1.5 hours)

**End of Day 2:** Fully functional billing system in production

---

## 🚨 CRITICAL PATH

These must be done IN ORDER:

1. **Environment Setup** → Can't test without Stripe configured
2. **Fix Pricing Page** → Can't upgrade without working checkout
3. **Billing Dashboard** → Users need to manage subscriptions
4. **Error Handling** → Users need upgrade prompts
5. **Testing** → Catch issues before production
6. **Production** → Launch to users

---

## 💡 QUICK WINS (Do These First)

If you only have 2 hours today, do these:

1. **Environment Setup** (30 mins)
   - Get Stripe working
   - Configure webhooks
   
2. **Fix Pricing Page** (45 mins)
   - Make upgrades possible
   
3. **Create Upgrade Modal** (45 mins)
   - Show when limits hit

**Result:** Users can upgrade when they hit limits (core functionality)

---

## 🎓 LEARNING RESOURCES

- [Stripe Subscriptions Guide](https://stripe.com/docs/billing/subscriptions/overview)
- [Stripe Webhooks](https://stripe.com/docs/webhooks)
- [Stripe Customer Portal](https://stripe.com/docs/billing/subscriptions/integrating-customer-portal)
- [Next.js 14 Server Actions](https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions)

---

## 📞 SUPPORT PLAN

If you get stuck:

1. **Stripe Issues:**
   - Check webhook logs in Stripe dashboard
   - Use Stripe CLI for local testing
   - Stripe support chat (very responsive)

2. **Database Issues:**
   - Check Supabase logs
   - Verify RLS policies
   - Test with service role key

3. **Frontend Issues:**
   - Check browser console
   - Verify API responses in Network tab
   - Test error scenarios

---

## ✨ BONUS FEATURES (After Launch)

Once core billing works, consider:

- [ ] **Usage-based billing** - Charge per document/conversation
- [ ] **Annual billing discount** - 20% off for yearly plans
- [ ] **Referral program** - Give credit for referrals
- [ ] **Team seats** - Charge per additional user
- [ ] **Add-ons** - Extra storage, priority support
- [ ] **Trial extension** - Automatic 7-day trial for active users

---

## 🎉 SUCCESS METRICS

After launch, track:

- **Conversion rate:** Free → Paid
- **Upgrade triggers:** Which limits cause upgrades?
- **Churn rate:** Monthly cancellations
- **MRR (Monthly Recurring Revenue)**
- **Average plan value**
- **Payment success rate**

---

**Status:** Ready to implement. Start with Phase 1 (Environment Setup).  
**Next Action:** Create Stripe products and configure webhooks.  
**ETA to Launch:** 2 working days (~8.5 hours)

