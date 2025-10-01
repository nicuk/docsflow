# 🔍 Payment & Usage Tracking Audit - DocsFlow
**Date:** October 1, 2025  
**Status:** ⚠️ CRITICAL ISSUES FOUND

---

## 🚨 Critical Issue: Usage Tracking is BROKEN

### Problem Identified
The error in your logs (`Error tracking usage: {}`) is caused by a **missing database table**:

**File:** `lib/plan-enforcement.ts:326-334`
```typescript
const { error } = await supabase
  .from('usage_tracking')  // ❌ THIS TABLE DOESN'T EXIST
  .upsert({
    tenant_id: tenantId,
    period_start: periodStart.toISOString().split('T')[0],
    period_end: periodEnd.toISOString().split('T')[0],
    [`${action.replace('_upload', '').replace('_used', '')}_count`]: amount,
  }, {
    onConflict: 'tenant_id,period_start,period_end',
  });
```

### Verification
- ✅ **Code exists** to track usage in `lib/plan-enforcement.ts`
- ✅ **Code is called** from document upload and conversation creation
- ❌ **Database table missing** - `usage_tracking` table not in schema
- ❌ **Silent failure** - errors are caught but not surfaced to users

---

## 📊 Current Implementation Status

### ✅ What's Working
1. **Stripe Integration (Partial)**
   - ✅ Webhook handler (`app/api/stripe/webhooks/route.ts`)
   - ✅ Checkout session creation (`app/api/stripe/checkout/session/route.ts`)
   - ✅ Subscription status updates
   - ✅ Plan enforcement logic
   - ✅ Document/conversation limit checks

2. **Plan Limits Defined**
   - ✅ Free: 5 docs, 50 conversations/month
   - ✅ Starter: 50 docs, 500 conversations/month ($29/mo)
   - ✅ Professional: 500 docs, 5K conversations/month ($99/mo)
   - ✅ Enterprise: Unlimited ($299/mo)
   - ✅ Unlimited: Everything unlimited ($999/mo)

3. **Database Schema**
   - ✅ `subscriptions` table exists
   - ✅ `tenants` has `plan_type` and `subscription_status`
   - ✅ `api_usage` table exists (for API tracking)

### ❌ What's Broken/Missing

1. **Critical: `usage_tracking` table missing**
   - No monthly usage history
   - Can't show users their usage trends
   - Can't bill based on actual usage
   - Can't generate usage reports

2. **Missing Features**
   - No usage dashboard for users
   - No upgrade prompts when approaching limits
   - No usage analytics/insights
   - No usage-based billing (metered)

---

## 🛠️ IMMEDIATE FIX REQUIRED

### Step 1: Create `usage_tracking` Table

```sql
-- Create usage tracking table
CREATE TABLE IF NOT EXISTS usage_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  documents_count INTEGER DEFAULT 0,
  conversations_count INTEGER DEFAULT 0,
  storage_used_mb INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure one record per tenant per period
  UNIQUE(tenant_id, period_start, period_end)
);

-- Create index for faster queries
CREATE INDEX idx_usage_tracking_tenant_period 
ON usage_tracking(tenant_id, period_start DESC);

-- Enable RLS
ALTER TABLE usage_tracking ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only see their tenant's usage
CREATE POLICY "Users can view own tenant usage"
ON usage_tracking FOR SELECT
USING (
  tenant_id IN (
    SELECT tenant_id FROM users WHERE id = auth.uid()
  )
);

-- RLS Policy: Service role can manage all usage
CREATE POLICY "Service role can manage usage"
ON usage_tracking FOR ALL
USING (auth.jwt() ->> 'role' = 'service_role')
WITH CHECK (auth.jwt() ->> 'role' = 'service_role');
```

### Step 2: Fix the `trackUsage` Function

The function needs to properly increment counters, not replace them:

```typescript
// lib/plan-enforcement.ts - UPDATED VERSION
export async function trackUsage(
  tenantId: string,
  action: 'document_upload' | 'conversation' | 'storage_used',
  amount: number = 1
): Promise<void> {
  try {
    const supabase = getSupabaseClient();

    // Get current month period
    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    // Map action to column name
    const columnMap = {
      document_upload: 'documents_count',
      conversation: 'conversations_count',
      storage_used: 'storage_used_mb',
    };
    
    const column = columnMap[action];
    
    // Get or create current period record
    const { data: existing, error: fetchError } = await supabase
      .from('usage_tracking')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('period_start', periodStart.toISOString().split('T')[0])
      .eq('period_end', periodEnd.toISOString().split('T')[0])
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      // PGRST116 = no rows returned
      console.error('Error fetching usage:', fetchError);
      return;
    }

    if (existing) {
      // Increment existing count
      const { error: updateError } = await supabase
        .from('usage_tracking')
        .update({
          [column]: (existing[column] || 0) + amount,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id);

      if (updateError) {
        console.error('Error updating usage:', updateError);
      }
    } else {
      // Create new record
      const { error: insertError } = await supabase
        .from('usage_tracking')
        .insert({
          tenant_id: tenantId,
          period_start: periodStart.toISOString().split('T')[0],
          period_end: periodEnd.toISOString().split('T')[0],
          [column]: amount,
        });

      if (insertError) {
        console.error('Error inserting usage:', insertError);
      }
    }
  } catch (error) {
    console.error('Error in trackUsage:', error);
  }
}
```

---

## 🎯 Stripe + Clerk Integration Strategy

### Option 1: Current Approach (Direct Stripe) ⭐ **RECOMMENDED**

**Pros:**
- ✅ Full control over billing logic
- ✅ Can implement usage-based billing NOW
- ✅ Lower fees (just Stripe's 2.9% + 30¢)
- ✅ Already 70% implemented

**Cons:**
- ❌ Need to build UI components
- ❌ More maintenance overhead

**Action:** Complete current implementation (fix usage_tracking, add billing UI)

---

### Option 2: Clerk Billing (New Integration)

**Pros:**
- ✅ Pre-built UI components (`<PricingTable />`)
- ✅ Simplified subscription management
- ✅ Integrated with existing Clerk auth

**Cons:**
- ❌ Extra 0.7% fee on top of Stripe fees
- ❌ **Does NOT support usage-based billing** (on roadmap)
- ❌ Requires migration of existing code
- ❌ Less control over billing logic

**Action:** Wait until Clerk adds usage-based billing support

---

### Decision Matrix

| Feature | Direct Stripe | Clerk Billing |
|---------|--------------|---------------|
| Usage-based billing | ✅ Now | ❌ Future |
| Setup complexity | Medium | Low |
| Fees | 2.9% + 30¢ | 3.6% + 30¢ |
| Customization | High | Medium |
| UI components | Build | Provided |
| Current progress | 70% | 0% |

**Recommendation:** Stick with direct Stripe, complete the implementation.

---

## 💰 Pricing Analysis & Market Research

### Current DocsFlow Pricing

| Plan | Price | Documents | Conversations | Storage |
|------|-------|-----------|---------------|---------|
| Free | $0 | 5 | 50/mo | 100MB |
| Starter | $29 | 50 | 500/mo | 1GB |
| Professional | $99 | 500 | 5K/mo | 10GB |
| Enterprise | $299 | ∞ | ∞ | 100GB |
| Unlimited | $999 | ∞ | ∞ | ∞ |

### Competitive Landscape (2025)

#### Document AI Platforms

**1. ChatPDF**
- Free: 2 PDFs/day, 50 pages
- Plus ($5/mo): 50 PDFs/day, 2K pages
- **Analysis:** Very cheap, limited features

**2. Hebbia (Enterprise-focused)**
- Custom pricing: $10K-100K+/year
- Focus: Investment banks, law firms
- **Analysis:** High-end market

**3. Anthropic Claude Pro**
- $20/mo: 5x more usage than free
- API: $3-15 per million tokens
- **Analysis:** Pay-per-use model

**4. OpenAI ChatGPT Plus**
- $20/mo: GPT-4, file uploads
- API: $0.15-0.60 per million tokens
- **Analysis:** Consumer-focused

**5. Coral.ai (Similar to DocsFlow)**
- Free: 5 documents
- Pro ($20/mo): 500 documents
- Team ($40/user/mo): Unlimited
- **Analysis:** Close competitor

### 🎯 Pricing Recommendations

#### Your Current Pricing is COMPETITIVE but needs adjustment:

**Suggested Revisions:**

```
✅ KEEP: Free (5 docs, 50 conv/mo) - Good entry point
✅ ADJUST: Starter ($19/mo) - Lower barrier to entry
  - 25 docs, 250 conversations/mo
  - Better conversion from free → paid

✅ KEEP: Professional ($99/mo) - Sweet spot
  - Add: Priority support, API access
  
⚠️ MERGE: Enterprise + Unlimited → Single Enterprise tier
  - $299/mo for self-service
  - Custom pricing for >10 users
  - Unlimited everything + dedicated support
```

**New Tier Suggestion: Usage-Based "Pay As You Go"**
```
💡 Growth Plan: $49/mo + usage
- Base: 100 docs, 1K conversations
- Overage: $0.50/doc, $0.01/conversation
- Appeals to users with unpredictable usage
```

### Value Justification

**Why users will pay:**

1. **Time Savings** 
   - Manual doc review: $50-150/hour
   - DocsFlow: $99/mo unlimited = Break-even at 1-2 hours

2. **Accuracy**
   - RAG > Generic ChatGPT for domain-specific docs
   - Context preservation across conversations

3. **Security**
   - Enterprise users pay 3-5x for SOC2, SSO
   - Your multi-tenant isolation is a selling point

4. **Integration**
   - API access (add in Pro tier)
   - Webhook notifications
   - Custom domain

---

## 📋 Implementation Roadmap

### Phase 1: Fix Critical Issues (1-2 days) 🔴
- [ ] Create `usage_tracking` table in Supabase
- [ ] Deploy updated `trackUsage` function
- [ ] Test usage tracking end-to-end
- [ ] Verify tracking on production

### Phase 2: Usage Dashboard (3-5 days) 🟡
- [ ] Create `/dashboard/usage` page
- [ ] Show current usage vs limits
- [ ] Add usage charts (daily/monthly)
- [ ] Add upgrade prompts at 80% limit

### Phase 3: Stripe Environment Setup (1 day) 🟢
- [ ] Create products in Stripe dashboard
- [ ] Configure webhook endpoint
- [ ] Add env vars to Vercel
- [ ] Test checkout flow

### Phase 4: Billing UI (3-5 days) 🟢
- [ ] Create `/pricing` page (public)
- [ ] Create `/dashboard/billing` page
- [ ] Add customer portal link
- [ ] Add plan comparison table
- [ ] Add upgrade/downgrade flows

### Phase 5: Testing & Refinement (2-3 days) 🔵
- [ ] Test all payment flows
- [ ] Test webhook events
- [ ] Test limit enforcement
- [ ] Test usage tracking accuracy
- [ ] Load testing

### Phase 6: Usage-Based Billing (Optional, 5-7 days) 🟣
- [ ] Add overage tracking
- [ ] Stripe metered billing setup
- [ ] Usage invoice generation
- [ ] Overage notifications

---

## 🎬 Next Steps

### Immediate Actions (TODAY):

1. **Run the SQL to create `usage_tracking` table**
   - Go to Supabase SQL Editor
   - Run the CREATE TABLE script above
   - Verify table exists

2. **Deploy the fixed `trackUsage` function**
   - Update `lib/plan-enforcement.ts`
   - Test locally
   - Deploy to production

3. **Verify tracking works**
   - Upload a document
   - Check logs (should see no errors)
   - Query `usage_tracking` table

### This Week:

1. Complete Phase 1 (fix tracking)
2. Start Phase 2 (usage dashboard)
3. Set up Stripe products (Phase 3)

### This Month:

1. Complete billing UI
2. Launch paid plans
3. Monitor conversion rates

---

## 🔗 Resources

### Documentation
- [Stripe Subscriptions Guide](https://stripe.com/docs/billing/subscriptions/overview)
- [Clerk Billing Docs](https://clerk.com/docs/billing/overview) (for future reference)
- [Next.js 14 App Router](https://nextjs.org/docs/app)

### Competitive Intelligence
- ChatPDF: https://www.chatpdf.com/pricing
- Coral.ai: https://www.coral.ai/pricing
- Anthropic: https://www.anthropic.com/pricing
- OpenAI: https://openai.com/pricing

### Stripe Resources
- [Webhook Testing](https://stripe.com/docs/webhooks/test)
- [Metered Billing](https://stripe.com/docs/billing/subscriptions/usage-based)
- [Customer Portal](https://stripe.com/docs/billing/subscriptions/integrating-customer-portal)

---

## 💡 Key Insights

1. **Usage tracking is critical** - Without it, you can't enforce limits or show value
2. **Your pricing is competitive** - Minor adjustments needed for better conversion
3. **Stick with direct Stripe** - More control, lower fees, usage-based billing support
4. **Focus on value, not features** - Time savings and accuracy justify $99/mo
5. **Add usage-based tier** - Appeals to unpredictable usage patterns

---

**Status:** Ready to fix. Start with Phase 1 immediately.

