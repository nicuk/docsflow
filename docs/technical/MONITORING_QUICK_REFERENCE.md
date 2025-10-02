# 🎯 Hybrid Model Monitoring - Quick Reference

## 📊 What to Watch

### Healthy System Looks Like:
```
📊 [QUERY CLASSIFIER] Stats (100 queries):
   Simple:  68-72% ✅
   Medium:  18-22% ✅
   Complex: 8-12%  ✅
   ✅ Within budget: Complex queries < 12%

💰 [COST MONITOR] Statistics:
   Total Calls:  100
   Total Cost:   $0.3384
   Complex: 10.0% ✅
```

### Warning Signs:
```
⚠️ [COST ALERT] Complex queries at 13.5% (threshold: 12%)
⚠️ [COST ALERT] Daily cost at $5.50 (warning threshold: $5.00)
```

### Critical Alerts:
```
🚨 [COST ALERT] CRITICAL: Daily cost at $22.00 (critical threshold: $20.00)
⚠️ [GUARDRAIL] Complex quota exceeded (15.2% > 12%). Downgrading to medium.
```

---

## 🔍 Log Patterns to Search For

### Check if Routing Works:
```bash
grep "ROUTING" vercel-logs.txt | tail -20
```

Expected output:
```
🟢 [ROUTING] Using SIMPLE tier (Mistral-7B, fast & cheap)
🟡 [ROUTING] Using MEDIUM tier (Llama-3.1-8B, balanced)
🔴 [ROUTING] Using COMPLEX tier (Claude Sonnet 3.5, premium quality)
```

### Check Cost Tracking:
```bash
grep "COST MONITOR" vercel-logs.txt | tail -20
```

Expected output:
```
💰 [COST MONITOR] mistralai/mistral-7b-instruct: +125 tokens ($0.0000)
💰 [COST MONITOR] anthropic/claude-3.5-sonnet: +850 tokens ($0.0026)
```

### Check for Alerts:
```bash
grep "ALERT" vercel-logs.txt
```

Should be empty or minimal. If many alerts, tune thresholds.

---

## 🎯 Quick Fixes

### Too Many Complex Queries (>15%)

**Quick Fix in classifier:**
```typescript
// lib/query-complexity-classifier.ts line 95
if (totalScore >= 0.80) {  // Was 0.75, now stricter
  complexity = 'complex';
```

### Too Few Complex Queries (<5%)

**Quick Fix in classifier:**
```typescript
// lib/query-complexity-classifier.ts line 95
if (totalScore >= 0.70) {  // Was 0.75, now more generous
  complexity = 'complex';
```

### Emergency: Disable Premium Models

```typescript
// app/api/chat/route.ts after line 188
const selectedModels = MODEL_CONFIGS.MEDIUM; // Override everything to medium
```

---

## 📈 Daily Checklist

### Morning (5 minutes):
- [ ] Check overnight stats: `grep "QUERY CLASSIFIER.*Stats" logs`
- [ ] Verify distribution: Simple ~70%, Medium ~20%, Complex ~10%
- [ ] Check for alerts: `grep "ALERT" logs | wc -l` (should be 0-2)
- [ ] Review daily cost estimate

### Weekly (15 minutes):
- [ ] Calculate weekly cost: `grep "COST MONITOR.*total:" logs | tail -1`
- [ ] Verify < $25/week (for typical 10K queries/week)
- [ ] Review complex query samples (are they truly complex?)
- [ ] Tune thresholds if needed

### Monthly (30 minutes):
- [ ] Generate cost report
- [ ] Compare quality metrics (user feedback)
- [ ] Adjust classifier if distribution shifted
- [ ] Document any changes made

---

## 🚨 Emergency Contacts

**If Cost Spike:**
1. Check: `grep "COMPLEX" logs | wc -l`
2. If >20% complex: Apply "Too Many Complex" fix above
3. If <20%: Check for API key leak or bot attack

**If Quality Drop:**
1. Check: `grep "model_used.*claude" logs | wc -l`
2. If 0 Claude uses: Classifier too strict, apply "Too Few Complex" fix
3. If many uses but bad quality: Check Claude API status

**If System Down:**
1. Check: `grep "All models failed" logs`
2. If yes: OpenRouter issue, will fall back to Gemini
3. If Gemini also fails: Check API keys

---

## 💰 Cost Estimates

### Conservative (Current):
```
10K queries/month:
  Simple (7K): $0.35
  Medium (2K): $0.10
  Complex (1K): $3.00
  Total: $3.45/month ✅
```

### Aggressive (More Complex):
```
10K queries/month:
  Simple (6K): $0.30
  Medium (2K): $0.10
  Complex (2K): $6.00
  Total: $6.40/month ⚠️
```

### Out of Control (No Guardrails):
```
10K queries/month:
  Simple (5K): $0.25
  Medium (2K): $0.10
  Complex (3K): $9.00
  Total: $9.35/month 🚨
```

**Guardrails save you $3-6/month per 10K queries!**

---

## ✅ Success Indicators

### Week 1:
- ✅ System runs without errors
- ✅ All 3 tiers being used
- ✅ Cost tracking logs appearing
- ✅ No critical alerts

### Week 4:
- ✅ Distribution stabilized at ~70/20/10
- ✅ Cost predictable ($3-5/month per 10K)
- ✅ Users happy with response quality
- ✅ <1 alert per day

### Month 3:
- ✅ No manual intervention needed
- ✅ Cost per query < $0.001
- ✅ System quality: 8.5/10
- ✅ ROI positive

---

## 📞 When to Get Help

**Contact Support If:**
- Cost >$50/month (for <100K queries)
- Complex queries >20% consistently
- Multiple critical alerts per day
- User complaints about quality drop
- System errors in routing logic

**Self-Service Fix If:**
- Complex queries 12-15% (tune thresholds)
- Cost $5-10/month (expected range)
- Occasional warnings (system working as designed)
- Minor distribution deviations (adjust over time)

---

## 🎯 TL;DR

**Good:**
- 70/20/10 distribution
- $3-5/month cost
- <5 alerts/week
- Happy users

**Action Needed:**
- >15% complex → Tune stricter
- <5% complex → Tune more generous
- >$10/month → Review usage
- Many alerts → Check thresholds

**Emergency:**
- >$50/month → Disable premium tier
- System errors → Rollback
- Quality issues → Check Claude usage
- Bot attack → Rate limiting

Keep this handy for daily monitoring! 📋

