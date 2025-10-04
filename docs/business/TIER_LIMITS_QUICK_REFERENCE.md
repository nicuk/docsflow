# Tier Limits Quick Reference

**Quick lookup for subscription tiers and their limits.**

---

## 📊 **Tier Comparison Table**

| Feature | Starter<br>$149/mo | Professional<br>$599/mo ⭐ | Enterprise<br>$2,199/mo | Custom<br>Contact Sales |
|---------|:------------------:|:-------------------------:|:----------------------:|:----------------------:|
| **Documents (Total)** | 500 | 5,000 | 25,000 | Unlimited |
| **Documents (Monthly)** | 500 | 1,500 | 8,000 | Unlimited |
| **Concurrent Uploads** | **5** | **10** | **30** | **50** |
| **Max File Size** | 10MB | 1MB | 100MB | 500MB |
| **Queries/Month** | 10K | 40K | 150K | Unlimited |
| **Team Members** | 5 | Unlimited | Unlimited | Unlimited |
| **Subdomains** | 1 | 5 | Unlimited | Unlimited |
| **API Access** | ❌ | ✅ | ✅ | ✅ |
| **Custom Branding** | ❌ | ✅ | ✅ | ✅ |
| **White-Label** | ❌ | ✅ | ✅ | ✅ |
| **Premium AI (Claude)** | ❌ | +$199/mo | ✅ Included | ✅ Included |
| **Support Response** | 48h | 24h | 4h | 1h |
| **SLA Guarantee** | ❌ | ❌ | ✅ | ✅ |
| **SOC2 Compliance** | ❌ | ❌ | Roadmap | ✅ |

---

## 🎯 **Key Differentiators**

### **Concurrent Uploads: 5 → 10 → 30**

This is the most visible user-facing difference between tiers.

| Tier | Concurrent Uploads | User Experience |
|------|-------------------|-----------------|
| **Starter** | **5 files at once** | Perfect for solo users, small batches |
| **Professional** | **10 files at once** | Great for teams, bulk uploads |
| **Enterprise** | **30 files at once** | Handle massive document migrations |

**Example:**
- User uploads 20 files on **Starter**: Processes in 4 batches (20÷5)
- Same 20 files on **Professional**: Processes in 2 batches (20÷10)
- Same 20 files on **Enterprise**: Processes in 1 batch (20÷30)

---

## 💰 **Cost Per Customer (After Optimizations)**

| Tier | Monthly Revenue | AI Cost | Infra Cost | Support Cost | Total Cost | **Profit** | **Margin** |
|------|----------------|---------|------------|--------------|------------|-----------|-----------|
| **Starter** | $149 | $2 | $2 | $10 | $14 | **$135** | **91%** |
| **Professional** | $599 | $7 | $5 | $50 | $62 | **$537** | **90%** |
| **Enterprise** | $2,199 | $20 | $10 | $200 | $230 | **$1,969** | **90%** |

**Note:** These are per-customer costs after Claude removal and Pro plan optimizations.

---

## 🚀 **Usage Examples**

### **Starter Tier ($149/mo)**
**Perfect for:**
- Solo founders testing RAG
- Consultants with 1-2 clients
- Small teams (<5 people)

**Typical usage:**
- Upload 50 documents/month
- 500 queries/month (100/week)
- 1-2 active users

---

### **Professional Tier ($599/mo)** ⭐
**Perfect for:**
- SaaS companies embedding RAG
- Agencies with 5-10 clients
- Growing teams (10-20 people)

**Typical usage:**
- Upload 200-500 documents/month
- 5,000-10,000 queries/month (1,200/week)
- 5-10 active users

---

### **Enterprise Tier ($2,199/mo)**
**Perfect for:**
- Large companies (200+ employees)
- Heavy document processing
- Compliance-required industries

**Typical usage:**
- Upload 2,000-5,000 documents/month
- 30,000-80,000 queries/month (7,000/week)
- 20-50 active users

---

## 📈 **Path to $5K MRR**

### **Scenario A: Focus on Professional**
- 8 Professional customers @ $599 = **$4,792 MRR**
- + 2 Starter customers @ $149 = **$298 MRR**
- **Total: $5,090 MRR** ✅

### **Scenario B: Mixed Tiers**
- 6 Professional @ $599 = $3,594
- 10 Starter @ $149 = $1,490
- **Total: $5,084 MRR** ✅

### **Scenario C: Enterprise Focus**
- 2 Enterprise @ $2,199 = $4,398
- 4 Starter @ $149 = $596
- **Total: $4,994 MRR** ✅

**Recommended: Scenario A (Focus on Professional tier)**

---

## 🔧 **Implementation Status**

| Component | Status | Notes |
|-----------|--------|-------|
| **Backend Limits** | ✅ Complete | `lib/subscription/tiers.ts` |
| **Limit Enforcement** | ✅ Complete | API routes check limits |
| **Database Schema** | ✅ Complete | Uses existing `tenants.plan_type` |
| **Concurrent Upload Limits** | ✅ Complete | 5/10/30 enforced |
| **File Size Limits** | ✅ Complete | 10MB/1MB/100MB enforced |
| **Frontend UI** | ⚠️ Pending | Need to show limits in UI |
| **Usage Dashboard** | ⚠️ Pending | Show progress bars |
| **Upgrade Flow** | ⚠️ Pending | Stripe integration |

---

## 🎯 **Setting a Tenant's Tier**

```sql
-- Set to Starter (default)
UPDATE tenants 
SET plan_type = 'starter' 
WHERE subdomain = 'acme';

-- Upgrade to Professional
UPDATE tenants 
SET plan_type = 'professional' 
WHERE subdomain = 'acme';

-- Upgrade to Enterprise
UPDATE tenants 
SET plan_type = 'enterprise' 
WHERE subdomain = 'bigcorp';
```

---

## 📊 **Monitoring Usage**

```sql
-- Check current usage for a tenant
SELECT 
  t.subdomain,
  t.plan_type,
  COUNT(d.id) as total_documents,
  ut.documents_count as documents_this_month,
  ut.conversations_count as queries_this_month
FROM tenants t
LEFT JOIN documents d ON d.tenant_id = t.id
LEFT JOIN usage_tracking ut ON ut.tenant_id = t.id 
  AND ut.period_start >= date_trunc('month', CURRENT_DATE)
WHERE t.subdomain = 'acme'
GROUP BY t.subdomain, t.plan_type, ut.documents_count, ut.conversations_count;
```

---

## 🚨 **Limit Enforcement Flow**

```
User uploads file
    ↓
1. Check file type (PDF, DOCX, etc.) ✅
    ↓
2. Check file size vs tier limit ✅
    ↓
3. Fetch tenant's plan_type from database ✅
    ↓
4. Check total documents vs limit ✅
    ↓
5. Check monthly documents vs limit ✅
    ↓
6. If all checks pass → Generate presigned URL ✅
    ↓
7. Client uploads directly to storage ✅
    ↓
8. Create job in queue ✅
    ↓
9. Increment usage counter ✅
```

**If any limit is exceeded:**
- Return 403 Forbidden
- Include limit details in response
- Show "Upgrade Required" message
- Provide link to upgrade page

---

## 💡 **Pro Tips**

### **Upselling Strategy:**
1. **At 80% of limit:** Show banner "You're using 400/500 documents. Upgrade for more!"
2. **At 100% of limit:** Block uploads, show clear upgrade CTA
3. **Email notification:** "You've reached your limit. Upgrade to continue."

### **Grace Period:**
- Allow 105% of limit (small buffer)
- Example: 525 docs on 500-doc limit
- Prevents frustration from rounding errors

### **Overage Pricing (Future):**
- Starter: No overages (hard limit)
- Professional: $0.50 per 100 extra documents
- Enterprise: $0.25 per 100 extra documents

---

## ✅ **Quick Checklist for Sales**

When talking to a prospect, ask:

- [ ] How many documents do you process per month?
- [ ] How many team members will use this?
- [ ] What's your typical file size?
- [ ] Do you need API access?
- [ ] Do you need custom branding?
- [ ] Do you need premium AI models (Claude)?

**Map answers to tiers:**
- <500 docs/month → **Starter**
- 500-1,500 docs/month → **Professional**
- >1,500 docs/month → **Enterprise**

---

## 🔥 **Bottom Line**

**Tier system is live and enforced!**

- ✅ Prevents over-quota usage
- ✅ Protects infrastructure costs
- ✅ Clear upgrade path
- ✅ Scalable to 100+ customers
- ⚠️ Just need frontend UI to show limits

**Ready to start selling.** 🚀

