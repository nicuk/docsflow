# Smart Routing Implementation Guide

**Complexity:** ⭐⭐ (2/10) - Very Simple!  
**Time to Implement:** 30 minutes  
**Lines of Code:** ~50 lines

---

## 🎯 **What's Already Built:**

✅ Query classifier exists (`lib/query-complexity-classifier.ts`)  
✅ Model configs exist (SIMPLE, MEDIUM, COMPLEX, PREMIUM)  
✅ Chat API already uses classifier (line 270 in `app/api/chat/route.ts`)  
✅ Tier system exists (`lib/subscription/tiers.ts`)  
✅ Tier checker exists (`lib/subscription/limit-checker.ts`)

**You literally just need to connect the dots!** 🔌

---

## 📝 **What Needs to Be Added:**

### **Step 1: Add premium_ai_models Feature to Tiers** (5 minutes)

Already done! It's in `lib/subscription/tiers.ts`:
- Starter: `premium_ai_models: false`
- Professional: `premium_ai_models: false` (can add via +$199 add-on)
- Enterprise: `premium_ai_models: true`

---

### **Step 2: Modify Chat API to Check Tier** (15 minutes)

**File:** `app/api/chat/route.ts`

**Current code (lines 274-292):**
```typescript
// 🚨 GUARDRAIL: Select models based on complexity
let selectedModels: string[];
switch (complexityAnalysis.complexity) {
  case 'simple':
    selectedModels = MODEL_CONFIGS.SIMPLE;
    break;
  case 'medium':
    selectedModels = MODEL_CONFIGS.MEDIUM;
    break;
  case 'complex':
    selectedModels = MODEL_CONFIGS.COMPLEX;  // ❌ Always uses cheap models
    break;
}
```

**New code (30 lines added):**
```typescript
// 🚨 SMART ROUTING: Select models based on complexity AND tier
let selectedModels: string[];
let shouldShowUpgradePrompt = false;

// Get tenant's subscription tier
const { getTenantTier, hasTierFeature } = await import('@/lib/subscription');
const tenantTier = await getTenantTier(supabase, tenantId);
const hasPremiumAI = hasTierFeature(tenantTier, 'premium_ai_models');

switch (complexityAnalysis.complexity) {
  case 'simple':
    selectedModels = MODEL_CONFIGS.SIMPLE;
    console.log('🟢 [ROUTING] SIMPLE tier (Mistral-7B)');
    break;
    
  case 'medium':
    selectedModels = MODEL_CONFIGS.MEDIUM;
    console.log('🟡 [ROUTING] MEDIUM tier (Llama-3.1-8B)');
    break;
    
  case 'complex':
    if (hasPremiumAI) {
      // Use premium models (Claude)
      selectedModels = MODEL_CONFIGS.PREMIUM;
      console.log('🔴 [ROUTING] COMPLEX tier with PREMIUM AI (Claude 3.5)');
      console.warn(`⚠️ [COST ALERT] Using premium model (Claude)`);
    } else {
      // Use best cheap model + show upgrade prompt
      selectedModels = MODEL_CONFIGS.COMPLEX;
      shouldShowUpgradePrompt = true;
      console.log('🟡 [ROUTING] COMPLEX tier WITHOUT premium (using best cheap model)');
      console.log('💡 [UPSELL] Will show upgrade prompt for Premium AI');
    }
    break;
    
  default:
    selectedModels = MODEL_CONFIGS.MEDIUM;
}
```

---

### **Step 3: Add Upgrade Prompt to Response** (10 minutes)

**File:** `app/api/chat/route.ts` (after generating response, around line 335)

**Add this:**
```typescript
// If complex query without premium AI, add upgrade suggestion
if (shouldShowUpgradePrompt) {
  answerText += '\n\n💡 **Tip:** For more accurate analysis on complex queries like this, consider upgrading to Premium AI (+$199/month) or Enterprise tier.';
}
```

---

## 🎯 **That's It! 3 Simple Changes:**

1. ✅ Tier definitions already have `premium_ai_models` flag
2. ✏️ Add 30 lines to chat API for tier checking
3. ✏️ Add 3 lines for upgrade prompt

**Total:** ~35 lines of code

---

## 🧪 **Testing (10 minutes):**

### **Test Case 1: Simple Query (Any Tier)**
```
Query: "What is our return policy?"
Expected: Uses mistral-7b, no upgrade prompt
Cost: $0.0001
```

### **Test Case 2: Complex Query (Starter/Professional)**
```
Query: "Compare our pricing across all documents and recommend changes"
Expected: Uses qwen-2.5-7b, SHOWS upgrade prompt
Cost: $0.0004
```

### **Test Case 3: Complex Query (Enterprise)**
```
Query: "Compare our pricing across all documents and recommend changes"
Expected: Uses Claude 3.5 Sonnet, NO upgrade prompt
Cost: $0.012
```

---

## 💰 **Cost Impact:**

### **Before (Current):**
- All queries use cheap models
- AI cost: $7/customer
- Some complex queries have poor quality

### **After (Smart Routing):**

**Starter/Professional ($599/mo):**
- 85% queries use cheap models
- 15% complex queries use cheap + upgrade prompt
- AI cost: $7/customer (same!)
- User sees upgrade path for better quality

**Professional + Premium ($798/mo):**
- 85% queries use cheap models
- 15% complex queries use Claude
- AI cost: $40/customer
- Excellent quality on ALL queries

**Enterprise ($2,199/mo):**
- 85% queries use cheap models
- 15% complex queries use Claude automatically
- AI cost: $40/customer
- Best experience, no upgrade prompts

---

## 📊 **Implementation Checklist:**

- [ ] Update `lib/subscription/tiers.ts` - Already done! ✅
- [ ] Modify chat API routing logic (30 lines)
- [ ] Add upgrade prompt (3 lines)
- [ ] Test with simple query
- [ ] Test with complex query (without premium)
- [ ] Test with complex query (with premium)
- [ ] Deploy to preview
- [ ] Monitor OpenRouter costs
- [ ] Collect user feedback

---

## 🚀 **Ready to Implement?**

This is honestly one of the EASIEST optimizations you can do:
- ✅ All infrastructure exists
- ✅ Classifier works great
- ✅ Just connect tier system to model selection
- ✅ 30 minutes of work
- ✅ Huge impact on quality AND revenue

**Want me to implement it now?**

