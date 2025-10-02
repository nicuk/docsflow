# 🔐 Clerk Google OAuth Setup Guide (CORRECTED)

**Date:** October 1, 2025  
**Status:** Ready to Configure  
**Critical Fix:** Google OAuth doesn't support wildcards - centralized OAuth flow required

---

## 🚨 **IMPORTANT: Google OAuth Limitation**

**Google OAuth does NOT support wildcards** (`*`) in redirect URIs. This is an OAuth 2.0 security requirement.

**Problem:** You have dynamic tenant subdomains (e.g., `bitto.docsflow.app`, `acme.docsflow.app`)
**Solution:** All OAuth must happen on the **main domain only**, then redirect to tenant subdomain after authentication.

---

## ✅ **What's Been Done**

### 1. Removed Custom Supabase Google OAuth ✅
**Deleted Files:**
- `app/api/auth/google/route.ts`
- `app/api/auth/google/callback/route.ts`

### 2. Updated Login Flow for Centralized OAuth ✅
**Modified:** `components/login-page.tsx`
- Users on tenant subdomains are redirected to main domain for OAuth
- After OAuth completes, they're redirected back to their tenant subdomain

### 3. Verified Auth Flow Compatibility ✅
Your existing redirect loop fixes work with this centralized OAuth approach.

---

## 📝 **Google Cloud Console Configuration**

### Step 1: Open Google Cloud Console

1. Go to: https://console.cloud.google.com/apis/credentials
2. Find your **OAuth 2.0 Client ID** for DocsFlow
3. Click to edit

### Step 2: Add EXACTLY These Redirect URIs

⚠️ **Delete ALL existing URIs and add only these:**

```
https://clerk.docsflow.app/v1/oauth_callback
https://docsflow.app/sso-callback
https://www.docsflow.app/sso-callback
http://localhost:3000/sso-callback
```

### Step 3: What NOT to Add

❌ **DO NOT ADD:**
- `https://*.docsflow.app/*` (wildcards not supported)
- `https://bitto.docsflow.app/*` (tenant subdomains)
- `https://api.docsflow.app/*` (old endpoint)
- `/api/auth/google/callback` (deleted route)

### Step 4: Save and Wait

1. Click **"Save"** at the bottom
2. **Wait 5 minutes** for Google to propagate changes
3. Test OAuth flow

---

## 🔄 **How the New Flow Works**

### Scenario 1: User on Main Domain (docsflow.app)

```
1. User at: https://docsflow.app/login
2. Clicks "Sign in with Google"
3. → Google OAuth (docsflow.app/sso-callback)
4. → Clerk processes callback
5. → Redirects to /onboarding or /dashboard
6. ✅ Works perfectly!
```

### Scenario 2: User on Tenant Subdomain (bitto.docsflow.app)

```
1. User at: https://bitto.docsflow.app/login
2. Clicks "Sign in with Google"
3. → Redirected to https://docsflow.app/login?oauth=google
4. → Google OAuth (docsflow.app/sso-callback)
5. → Clerk processes callback
6. → Redirects to /dashboard
7. → Dashboard detects tenant → Redirects to bitto.docsflow.app/dashboard
8. ✅ User ends up on their tenant subdomain!
```

---

## 💻 **Code Changes Made**

### Updated: `components/login-page.tsx`

```typescript
const handleGoogleAuth = async () => {
  // 🎯 CRITICAL FIX: Google OAuth doesn't support wildcards
  // Must redirect to main domain for OAuth, then back to tenant subdomain
  const currentHostname = window.location.hostname;
  const isSubdomain = currentHostname.includes('.docsflow.app') && 
                     !currentHostname.startsWith('www.') &&
                     currentHostname !== 'docsflow.app';
  
  if (isSubdomain) {
    // Redirect to main domain for OAuth
    window.location.href = `https://docsflow.app/login?oauth=google`;
    return;
  }
  
  // Google OAuth only works from main domain
  await signIn.authenticateWithRedirect({
    strategy: "oauth_google",
    redirectUrl: "/sso-callback",
    redirectUrlComplete: "/dashboard"
  })
}
```

**Why this works:**
- OAuth always happens on `docsflow.app` (supported by Google)
- After auth, user is redirected to `/dashboard`
- Dashboard middleware detects user's tenant and redirects to tenant subdomain
- No redirect loops due to existing safeguards

---

## 📋 **Clerk Dashboard Configuration**

### Step 1: Add Google OAuth Provider

1. **Go to:** https://dashboard.clerk.com
2. **Navigate to:** Your Application → **Configure** → **SSO Connections**
3. **Click:** "Add connection" → Select **Google**

### Step 2: Add Scopes

In the **Scopes** section, add these three (already shown by default):

```
openid
https://www.googleapis.com/auth/userinfo.email
https://www.googleapis.com/auth/userinfo.profile
```

### Step 3: Save

Click **"Add connection"**

---

## 🧪 **Testing the Flow**

### Test 1: From Main Domain
```bash
1. Go to: https://docsflow.app/login
2. Click "Sign in with Google"
3. Authorize with Google
4. Should redirect to /onboarding (new user) or /dashboard (existing user)
```

### Test 2: From Tenant Subdomain
```bash
1. Go to: https://bitto.docsflow.app/login
2. Click "Sign in with Google"
3. Should redirect to docsflow.app for OAuth
4. After OAuth, redirected back to bitto.docsflow.app/dashboard
```

### Test 3: New User Onboarding
```bash
1. Sign in with Google (first time)
2. Complete onboarding
3. Should end up on {tenant}.docsflow.app/dashboard
4. No redirect loops
```

---

## ⚠️ **Troubleshooting**

### Error: "redirect_uri_mismatch"

**Cause:** Your redirect URI in Google Cloud Console doesn't match Clerk's callback URL.

**Fix:** 
1. Check Clerk dashboard for exact callback URL
2. Add it to Google Cloud Console exactly as shown
3. Wait 5 minutes for changes to propagate

### Error: "Invalid redirect_uri: contains wildcard"

**Cause:** You added a wildcard URI like `https://*.docsflow.app/*`

**Fix:**
1. Remove the wildcard URI
2. Only use the 4 specific URIs listed above

### OAuth works on main domain but not tenant subdomain

**Expected behavior!** OAuth only works on main domain.

**Verify:**
- User is redirected from tenant subdomain to main domain for OAuth
- After OAuth, user is redirected back to their tenant subdomain
- Check `components/login-page.tsx` lines 165-179

---

## 📊 **Architecture Comparison**

### ❌ Before (Broken with Dynamic Tenants)

```
User on bitto.docsflow.app
  ↓
Tries OAuth directly on bitto.docsflow.app
  ↓
❌ Google rejects: redirect_uri_mismatch
  (Can't add all tenant subdomains - they're created dynamically!)
```

### ✅ After (Centralized OAuth)

```
User on bitto.docsflow.app
  ↓
Redirected to docsflow.app for OAuth
  ↓
OAuth completes on docsflow.app ✅
  ↓
Redirected to /dashboard
  ↓
Middleware detects tenant → redirects to bitto.docsflow.app/dashboard ✅
```

---

## 🎯 **Summary**

### What to Add to Google Cloud Console:
```
https://clerk.docsflow.app/v1/oauth_callback
https://docsflow.app/sso-callback
https://www.docsflow.app/sso-callback
http://localhost:3000/sso-callback
```

### What NOT to Add:
- ❌ Any wildcard URIs
- ❌ Tenant subdomain URIs
- ❌ Old `/api/auth/google/callback` routes

### How It Works:
1. All OAuth happens on main domain only
2. After OAuth, user is redirected to their tenant subdomain
3. Existing redirect loop fixes prevent issues
4. Works seamlessly for both new and existing users

---

## ✅ **Ready to Go!**

Once you:
1. Add the 4 URIs to Google Cloud Console
2. Enable Google OAuth in Clerk Dashboard
3. Wait 5 minutes

Then test from both:
- ✅ `https://docsflow.app/login`
- ✅ `https://bitto.docsflow.app/login`

Both should work perfectly with the centralized OAuth flow! 🚀
