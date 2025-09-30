# 🧪 Clerk Multi-Subdomain Test (5 Minutes)

## Test Scenario
Verify if Clerk can handle cross-subdomain authentication better than Supabase.

## Steps to Test:

### 1. Sign Up with Clerk
- Go to: `https://www.docsflow.app/sign-up-clerk`
- Create test account: `clerk-test@example.com`
- Note: Clerk handles this automatically

### 2. Check Session on Main Domain
- After sign up, you should be at `/dashboard-clerk`
- Open DevTools → Application → Cookies
- Look for `__session` cookie
- Check: Does it have `domain: .docsflow.app`?

### 3. Navigate to Tenant Subdomain
**Manual Test:**
- In browser, navigate to: `https://bitto.docsflow.app/dashboard-clerk`

**Expected Results:**
✅ **If Clerk Works:**
- You stay logged in
- No redirect to login
- Dashboard shows your user info

❌ **If Clerk Fails:**
- Redirected to sign-in page
- Session lost
- Same issue as Supabase

### 4. Test Cookie Persistence
**Check cookies on both domains:**
```
www.docsflow.app        → __session cookie present?
bitto.docsflow.app      → __session cookie accessible?
```

## Why This Tests the Core Issue

**Supabase Problem:**
- Cookie exists but session not readable across subdomains
- Token validation fails

**Clerk Should:**
- Use `__session` cookie with `.docsflow.app` domain
- JWT embeds tenant info
- Session readable across all subdomains

## Results to Share:

### If Successful:
- ✅ Stayed logged in across subdomains
- ✅ Cookie domain: `.docsflow.app`
- ✅ User info displayed correctly

### If Failed:
- ❌ Logged out when navigating to subdomain
- ❌ Cookie not accessible
- ❌ Same issue as Supabase

## Next Steps Based on Results:

**If Clerk Works (95% expected):**
→ Continue with Phase 3 migration
→ Gradually replace Supabase auth

**If Clerk Fails (5% chance):**
→ The issue is DNS/Vercel configuration
→ Need to fix subdomain cookie settings in Vercel
→ OR switch to single-domain pattern

