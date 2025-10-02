# Cost Analysis & Pricing Validation

**Date:** January 2025  
**Purpose:** Validate if proposed pricing ($99, $500, $2000/month) is sustainable given infrastructure costs  
**Platform:** DocsFlow Multi-Tenant RAG  
**Current Plan:** Vercel Pro ($20/month)

---

## 🚨 **EXECUTIVE SUMMARY**

### **Critical Findings:**

| Question | Answer | Status |
|----------|--------|--------|
| **Will cron every 5 min break the bank?** | **NO** - Only 8,640 invocations/month (0.8% of limit) | ✅ SAFE |
| **Can we sustain $500/month tier?** | **YES** - But with tight margins (65% gross margin) | ⚠️ RISKY |
| **Can we support 100K queries/month?** | **YES** - Costs ~$15-30 in AI/infra | ✅ SAFE |
| **Can we support 10K documents?** | **MAYBE** - Costs ~$50-100 for processing | ⚠️ TIGHT |
| **Should we adjust pricing?** | **YES** - Consider $199 Starter, $799 Pro | 🎯 RECOMMENDED |

---

## 💰 **Vercel Pro Cost Breakdown**

### **Base Plan: $20/month**

| Resource | Included | Overage Cost | Your Usage (Estimated) | Safe? |
|----------|----------|--------------|------------------------|-------|
| **Function Invocations** | 1,000,000/mo | $0.60 per 1M extra | ~50K-100K/mo | ✅ SAFE (5-10%) |
| **Function Duration** | 1,000 GB-hours | $0.18 per GB-hour | ~100-200 GB-hours | ✅ SAFE (10-20%) |
| **Bandwidth** | 1 TB | $0.15 per GB | ~50-100 GB | ✅ SAFE (5-10%) |
| **Build Minutes** | 400 hours | Included | ~5 hours/mo | ✅ SAFE (1%) |
| **Edge Requests** | Unlimited | Included | Unlimited | ✅ SAFE |

### **Cron Job Impact:**

```
Cron every 5 minutes:
- 60 minutes / 5 = 12 runs per hour
- 12 × 24 hours = 288 runs per day
- 288 × 30 days = 8,640 runs per month

Cost:
- Function invocations: 8,640 (0.8% of 1M limit) ✅
- Duration per run: ~5-10 seconds with 1024MB memory
- Monthly GB-hours: 8,640 × 1GB × (7s/3600s) = ~17 GB-hours (1.7% of limit) ✅

VERDICT: Cron is negligible - only 0.8% of invocations
```

### **User Traffic Impact:**

```
Assumptions for 10 customers paying $500/month:
- Average 5 users per tenant
- 50 total active users
- Each user: 5 queries/day, 2 document uploads/week

Daily invocations:
- Queries: 50 users × 5 queries = 250/day
- Documents: 10 tenants × 4 docs/week = ~6/day
- Total: ~260/day × 30 = 7,800/month

Total with cron: 8,640 + 7,800 = 16,440 invocations/month (1.6% of limit) ✅

VERDICT: Even with 10 customers, you're using <2% of limits
```

---

## 🤖 **AI Model Costs (OpenRouter + Google)**

### **Current Model Stack:**

| Use Case | Model | Provider | Cost per 1M Tokens | Your Usage |
|----------|-------|----------|---------------------|------------|
| **Embeddings** | text-embedding-004 | Google | **$0.025/1M** | High (every doc chunk + query) |
| **Simple Queries (70%)** | mistral-7b / qwen-2.5-7b | OpenRouter | **$0.05/1M** | Moderate |
| **Medium Queries (20%)** | qwen-2.5-7b / llama-3.1-8b | OpenRouter | **$0.05/1M** | Moderate |
| **Complex Queries (10%)** | claude-3.5-sonnet | OpenRouter | **$3.00/1M** 🚨 | Low but expensive |
| **Document Processing** | qwen-2.5-7b | OpenRouter | **$0.05/1M** | High |
| **Fallback** | gemini-2.0-pro | Google | **$1.25/1M** | Low |

### **Cost Calculation: Professional Tier ($500/month)**

#### **Document Processing (10,000 documents/month):**

```
Assumptions:
- Average document: 10 pages, 5,000 words
- After extraction: ~5,000 tokens per document
- Chunking: 5 chunks per document, 1,000 tokens each

Processing costs per document:
1. Text extraction: Free (PDF.js, docx parser)
2. AI Chunking (qwen-2.5-7b): 5,000 tokens @ $0.05/1M = $0.00025
3. Embedding generation (5 chunks): 5 × 1,000 tokens @ $0.025/1M = $0.000125
Total per document: $0.000375 (~$0.0004)

For 10,000 documents:
10,000 × $0.0004 = $4.00/month in AI costs ✅

BUT WAIT - Document storage in Supabase:
- 10,000 docs × 5 chunks = 50,000 chunks
- Each chunk: ~1KB text + 1.5KB embedding = 2.5KB
- Total: 50,000 × 2.5KB = 125 MB
- Supabase free tier: 500 MB (you're fine) ✅

VERDICT: Processing 10K docs costs ~$4-5/month
```

#### **Query Processing (100,000 queries/month):**

```
Assumptions:
- 70% simple queries (70,000)
- 20% medium queries (20,000)
- 10% complex queries (10,000)

Per query costs:
1. Query embedding: 50 tokens @ $0.025/1M = $0.00000125
2. Vector search: Free (Supabase pgvector)
3. Context retrieval: Free (database read)
4. LLM generation:
   - Simple (mistral-7b): 500 tokens @ $0.05/1M = $0.000025
   - Medium (qwen-2.5-7b): 1,000 tokens @ $0.05/1M = $0.00005
   - Complex (claude-3.5-sonnet): 2,000 tokens @ $3/1M = $0.006 🚨

Total costs:
- Simple: 70,000 × $0.000026 = $1.82
- Medium: 20,000 × $0.000051 = $1.02
- Complex: 10,000 × $0.006 = $60.00 🚨🚨🚨

Total: $62.84/month in query costs

PROBLEM: Complex queries with Claude are 240x more expensive!
```

#### **🚨 CRITICAL ISSUE: Claude Pricing**

Your current setup uses `claude-3.5-sonnet` for 10% of queries, which accounts for **95% of your AI costs**.

```
Cost breakdown:
- Document processing: $4 (6%)
- Simple/medium queries: $2.84 (4%)
- Complex queries (Claude): $60 (90%) 🚨

Total AI cost for $500/month tier: $66.84/month
```

---

## 📊 **Total Cost Per Customer (Professional Tier)**

### **Scenario: $500/month customer using full limits**

| Cost Category | Monthly Cost | % of Revenue |
|---------------|--------------|--------------|
| **Vercel Pro (prorated)** | $2.00 | 0.4% |
| **Supabase (Free tier)** | $0.00 | 0% |
| **AI - Document Processing** | $4.00 | 0.8% |
| **AI - Query Processing** | $62.84 | 12.6% 🚨 |
| **Overheads (domains, etc)** | $5.00 | 1.0% |
| **Support (10h @ $50/h)** | $50.00 | 10.0% |
| **TOTAL COST** | **$123.84** | **24.8%** |

**Gross Margin: 75.2%** ✅ (Target: >70%)

---

### **Scenario: 10 customers @ $500/month**

| Metric | Value |
|--------|-------|
| **Monthly Revenue** | $5,000 |
| **Infrastructure Costs** | $20 (Vercel) + $0 (Supabase) = $20 |
| **AI Costs** | 10 × $66.84 = $668.40 🚨 |
| **Support Costs** | 10 × $50 = $500 |
| **Other Costs** | $50 (domains, tools) |
| **TOTAL COSTS** | **$1,238.40** |
| **NET PROFIT** | **$3,761.60** |
| **Profit Margin** | **75.2%** ✅ |

**VERDICT: Sustainable at $500/month, but Claude usage is a risk**

---

## 🔍 **Risk Analysis**

### **Risk 1: Claude 3.5 Sonnet Usage** 🚨 **HIGH RISK**

**Problem:** 10% of queries using Claude costs $60/month per customer.

**Solutions:**

1. **Remove Claude from automatic rotation** (recommended)
   ```typescript
   // lib/openrouter-client.ts
   COMPLEX: [
     'qwen/qwen-2.5-7b-instruct',      // $0.05/1M (120x cheaper)
     'meta-llama/llama-3.1-8b-instruct', // $0.05/1M
     // REMOVE: 'anthropic/claude-3.5-sonnet'
   ]
   ```
   **Impact:** Reduces AI costs from $66.84 → $6.84 (90% reduction) ✅

2. **Make Claude opt-in only** (Premium add-on)
   - Offer "Premium AI" add-on at +$200/month
   - Only enterprise tier gets Claude by default

3. **Implement strict rate limiting for Claude**
   - Max 100 Claude queries per customer per month
   - After that, fallback to cheaper models

**Recommended:** Remove Claude from auto-rotation, offer as $200/month add-on.

---

### **Risk 2: Document Processing Spikes** ⚠️ **MEDIUM RISK**

**Problem:** Customer uploads 10,000 documents in week 1, then barely uses system.

**Solutions:**

1. **Implement rate limiting:**
   - Max 500 documents per day per tenant
   - Prevents abuse and spreads costs

2. **Tiered document limits:**
   - Starter: 500 docs/month
   - Professional: 2,000 docs/month (not 10K)
   - Enterprise: 10,000 docs/month

**Recommended:** Reduce Professional tier to 2,000 docs/month, charge overage at $0.01/doc.

---

### **Risk 3: Supabase Free Tier Limits** ⚠️ **MEDIUM RISK**

**Current Free Tier:**
- 500 MB database storage
- 1 GB file storage
- 2 GB bandwidth/month

**Your Usage at 10 customers:**
- Database: ~500 MB (50K chunks × 10KB) - AT LIMIT ⚠️
- File storage: ~5 GB (raw documents) - OVER LIMIT 🚨
- Bandwidth: ~50 GB/month - OVER LIMIT 🚨

**Solution: Upgrade to Supabase Pro ($25/month)**
- 8 GB database
- 100 GB file storage
- 50 GB bandwidth (then $0.09/GB)

**New total infra cost: $20 (Vercel) + $25 (Supabase) = $45/month**

---

## 💡 **Revised Pricing Recommendations**

### **Option A: Conservative (Recommended for Launch)**

| Tier | Price | Docs/mo | Queries/mo | AI Model | Margin |
|------|-------|---------|------------|----------|--------|
| **Starter** | $199/mo | 500 | 10K | Cheap (qwen) | 85% |
| **Professional** | $799/mo | 2,000 | 50K | Cheap + Claude opt-in | 80% |
| **Enterprise** | $2,499/mo | 10K | 200K | All models | 75% |

**To reach $5K MRR:** 6-7 Professional customers

**Justification:**
- Higher prices = fewer customers needed
- Better margins = more sustainable
- Professional services justify premium pricing

---

### **Option B: Aggressive (Higher Volume)**

| Tier | Price | Docs/mo | Queries/mo | AI Model | Margin |
|------|-------|---------|------------|----------|--------|
| **Starter** | $99/mo | 500 | 5K | Cheap only | 75% |
| **Professional** | $499/mo | 1,000 | 25K | Cheap + limited Claude | 70% |
| **Enterprise** | $1,999/mo | 5K | 100K | All models | 75% |

**To reach $5K MRR:** 10-12 Professional customers

**Justification:**
- Lower entry price = more customers
- Tighter margins = need higher volume
- Risk: Customer support costs scale with volume

---

### **Option C: Hybrid (Best of Both)**

| Tier | Price | Docs/mo | Queries/mo | AI Model | Add-ons |
|------|-------|---------|------------|----------|---------|
| **Starter** | $149/mo | 500 | 10K | Cheap only | - |
| **Professional** | $599/mo | 1,500 | 40K | Cheap only | +$199 for Claude |
| **Enterprise** | $2,199/mo | 8K | 150K | All models | Custom |

**To reach $5K MRR:** 8-9 Professional customers

**Justification:**
- Middle ground on pricing
- Claude as add-on protects margins
- Scalable for growth

---

## 🎯 **Recommended Action Plan**

### **Phase 1: Launch with Tight Controls** (Week 1)

1. **Remove Claude from auto-rotation** ✅
   ```typescript
   // Update MODEL_CONFIGS.COMPLEX to use cheap models only
   COMPLEX: [
     'qwen/qwen-2.5-7b-instruct',
     'meta-llama/llama-3.1-8b-instruct'
   ]
   ```

2. **Update pricing to Option C (Hybrid)** ✅
   - Starter: $149/month
   - Professional: $599/month
   - Enterprise: $2,199/month

3. **Implement usage tracking** ✅
   - Track AI costs per tenant in real-time
   - Alert when customer exceeds expected usage

4. **Set conservative limits** ✅
   - Starter: 500 docs, 10K queries
   - Professional: 1,500 docs, 40K queries
   - Enterprise: Custom

---

### **Phase 2: Monitor & Optimize** (Week 2-4)

1. **Track metrics daily:**
   - AI cost per customer
   - Average queries per customer
   - Document processing costs
   - Support time per customer

2. **Identify optimization opportunities:**
   - Are customers actually using limits?
   - Which features drive the most value?
   - Where can we reduce costs?

3. **A/B test pricing:**
   - Test $499 vs $599 for Professional
   - Test different limit combinations

---

### **Phase 3: Scale & Upsell** (Month 2-3)

1. **Add "Premium AI" add-on** ($199/month)
   - Unlocks Claude 3.5 Sonnet
   - Markets as "premium quality responses"
   - Only sell to customers who need it

2. **Introduce overage pricing:**
   - Documents: $0.50 per 100 over limit
   - Queries: $5 per 1,000 over limit
   - Protects margins while allowing flexibility

3. **Upgrade to paid infrastructure when needed:**
   - Supabase Pro at 5 customers: $25/month
   - Total infra: $45/month
   - Still <1% of revenue at $5K MRR

---

## 📈 **Financial Projections**

### **Scenario: 10 customers @ $599/month (Hybrid pricing)**

| Revenue & Costs | Monthly | Annual |
|-----------------|---------|--------|
| **Revenue** | $5,990 | $71,880 |
| **Vercel Pro** | $20 | $240 |
| **Supabase Pro** | $25 | $300 |
| **AI Costs (no Claude)** | $68 | $816 |
| **Support (5h/customer)** | $250 | $3,000 |
| **Other Costs** | $50 | $600 |
| **TOTAL COSTS** | $413 | $4,956 |
| **NET PROFIT** | **$5,577** | **$66,924** |
| **Profit Margin** | **93.1%** 🚀 | **93.1%** 🚀 |

**With Claude removed, margins are EXCELLENT.**

---

## ✅ **Final Recommendations**

### **Infrastructure Changes:**

1. ✅ **Keep cron at 5 minutes** - Only 0.8% of invocations, negligible cost
2. ✅ **Implement Phase 1 optimizations from roadmap** - 60s timeout, increased concurrency
3. 🚨 **REMOVE Claude from auto-rotation** - Saves 90% of AI costs
4. ⚠️ **Plan to upgrade Supabase to Pro at customer #5** - $25/month

### **Pricing Changes:**

1. 🎯 **Use Hybrid pricing (Option C)**:
   - Starter: $149/month (500 docs, 10K queries)
   - Professional: $599/month (1,500 docs, 40K queries)
   - Enterprise: $2,199/month (8K docs, 150K queries)

2. 💎 **Offer "Premium AI" add-on**: $199/month for Claude access

3. 📊 **Add overage pricing**:
   - $0.50 per 100 extra documents
   - $5 per 1,000 extra queries

### **GTM Strategy Adjustment:**

Update your GTM doc to reflect:
- New pricing: $149, $599, $2,199
- Need 8-9 Professional customers for $5K MRR (instead of 10)
- Emphasize value over features (save 6 months of dev time = worth $60K+)

---

## 🔥 **Bottom Line**

### **Your Questions Answered:**

1. **Will cron break the bank?**
   - **NO.** Cron every 5 min = 8,640 invocations (0.8% of limit)
   - Cost: Effectively $0.00

2. **Can we sustain $500/month pricing?**
   - **YES, BUT...** margins are tight (70%) if Claude is used
   - **BETTER:** $599/month without Claude = 93% margin 🚀

3. **Can we support 100K queries, 10K documents?**
   - **Queries:** Yes, but lower to 40K for Professional tier
   - **Documents:** Yes, but lower to 1,500 for Professional tier
   - **Unlimited team members:** Yes, no cost impact

4. **Should we improve LLM models?**
   - **NO.** Your current models (qwen, mistral, llama) are perfect
   - **DO:** Remove Claude from auto-use to protect margins
   - **OFFER:** Claude as premium add-on for power users

### **Action This Week:**

1. Remove Claude from MODEL_CONFIGS.COMPLEX
2. Update pricing to $149/$599/$2,199
3. Implement Phase 1 optimizations (15 minutes)
4. Launch and get first 3 customers

**You're good to go. Ship it.** 🚀

