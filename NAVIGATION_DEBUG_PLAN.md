# Navigation Debug Plan - Links Not Working

## Status: ✅ TENANT ID HEADER FIX APPLIED

### 🔧 Fix Applied: Middleware Now Resolves Tenant UUID
**Problem:** `x-tenant-id` header was `null`, forcing API routes to re-lookup tenant from subdomain
**Solution:** Modified `middleware.ts` to resolve tenant UUID from subdomain using `TenantContextManager` (Redis-cached)
**Impact:** 
- Eliminates redundant tenant lookups in each API route
- `x-tenant-id` header now populated with UUID on every request
- Reduces latency by ~50-100ms per request (database lookup avoided)

---

## Status: 🔴 STILL BROKEN AFTER FIX #1

## Symptoms
- ❌ Sidebar navigation links don't work (Documents, Chat, Settings)
- ❌ Dropdown menu items don't work (Profile, Billing, Settings)
- ✅ Logout button DOES work
- ✅ Worked with Supabase, broke after Clerk migration
- ❌ AuthContext fix didn't resolve the issue

## Hypothesis: AuthContext Redirect Loop

### The Problem
```typescript
// contexts/AuthContext.tsx line 158-160
if (!onboardingDone && pathname !== '/onboarding' && !justCompletedOnboarding) {
  router.push('/onboarding')  // ⚠️ This blocks ALL navigation attempts
}
```

### Why This Breaks Navigation
1. User completes onboarding for `sculptai` tenant
2. Clerk metadata update has slight delay (async)
3. User tries to click "Documents"
4. AuthContext `useEffect` runs
5. Sees `onboardingComplete: false` (stale metadata)
6. Calls `router.push('/onboarding')` IMMEDIATELY
7. Original navigation cancelled
8. User sees nothing happen

### Evidence
```
✅ [SESSION API] Clerk user authenticated: {
  email: 'support@sculptai.xyz',
  tenantId: 'none',  // ⚠️ Still 'none' - metadata not updated yet
  onboardingComplete: false  // ⚠️ Still false - just completed
}
```

## Fix Options

### Option A: Add Delay Before Redirect 🎯 RECOMMENDED
```typescript
// Only redirect to onboarding after a delay to let metadata sync
if (!onboardingDone && pathname !== '/onboarding' && !justCompletedOnboarding) {
  // Wait 1 second before redirecting - gives Clerk metadata time to sync
  setTimeout(() => {
    if (window.location.pathname !== '/onboarding') {
      router.push('/onboarding')
    }
  }, 1000)
}
```

### Option B: Don't Block Navigation on Dashboard
```typescript
// Only redirect if on public pages, not if already on dashboard
const publicPages = ['/login', '/signup', '/']
const isPublicPage = publicPages.some(page => pathname.startsWith(page))

if (!onboardingDone && isPublicPage && !justCompletedOnboarding) {
  router.push('/onboarding')
}
```

### Option C: Remove Redirect Entirely
- Let Clerk middleware handle all routing
- Remove AuthContext redirect logic completely

## Testing Steps

1. **Check Console**: Look for repeated `router.push` calls
2. **Check Network**: See if navigation requests are being cancelled
3. **Test Direct**: `document.querySelector('[href="/dashboard/documents"]').click()`
4. **Check State**: Log `onboardingComplete` in real-time

## Additional Investigation Needed

### Theory: Event Propagation Blocked

**Possible Issues:**
1. Event handler returning false
2. preventDefault() being called
3. stopPropagation() blocking clicks
4. Parent element catching events

**Test in Console:**
```javascript
// Check if Link has proper href
console.log(document.querySelector('[href="/dashboard/documents"]'))

// Try programmatic click
document.querySelector('[href="/dashboard/documents"]').click()

// Check for event listeners
getEventListeners(document.querySelector('[href="/dashboard/documents"]'))

// Try manual navigation
window.location.href = '/dashboard/documents'
```

### Theory: React Event System Issue

**Possible Issues:**
1. React hydration mismatch
2. Event handlers not attached after hydration
3. `pointer-events: none` in computed styles
4. Parent component preventing default

**Check:**
```javascript
// In browser console
const link = document.querySelector('[href="/dashboard/documents"]')
console.log(window.getComputedStyle(link).pointerEvents)
console.log(window.getComputedStyle(link.parentElement).pointerEvents)
```

### Theory: Layout Component Blocking

**Files to Check:**
- `app/dashboard/layout.tsx` - Check for overlays or event handlers
- `components/ui/sidebar.tsx` - Check sidebar component
- Any wrapper components around navigation

**Look for:**
- `onClick={(e) => e.preventDefault()}`
- `pointer-events: none`
- `z-index` issues with overlays
- `position: absolute` overlays

### Theory: ClerkProvider Issue

**Possible Issues:**
1. ClerkProvider not fully initialized
2. Clerk loading state blocking UI
3. Clerk component wrapping causing issues

**Check:**
```javascript
// In console
console.log(window.Clerk)
console.log(window.Clerk?.loaded)
```

## Next Steps - Systematic Debugging

1. **Open Browser DevTools Console**
2. **Run diagnostics:**
   ```javascript
   // Test 1: Can we select the link?
   const link = document.querySelector('[href="/dashboard/documents"]')
   console.log('Link found:', !!link)
   
   // Test 2: What are its styles?
   if (link) {
     console.log('Pointer events:', window.getComputedStyle(link).pointerEvents)
     console.log('Display:', window.getComputedStyle(link).display)
     console.log('Visibility:', window.getComputedStyle(link).visibility)
   }
   
   // Test 3: Can we click it programmatically?
   if (link) {
     link.click()
     console.log('Programmatic click attempted')
   }
   
   // Test 4: Can we navigate manually?
   window.location.href = '/dashboard/documents'
   ```

3. **Check Network Tab** - Does navigation create any requests?

4. **Check Elements Tab** - Inspect the actual link element for:
   - Computed styles
   - Event listeners
   - Parent elements with potential blockers

## Root Cause Analysis

The issue is **NOT**:
- ❌ Overlay blocking (we fixed that)
- ❌ CSS pointer-events
- ❌ Missing href attributes
- ❌ Broken Link components

The issue **IS**:
- ✅ AuthContext intercepting ALL navigation
- ✅ Clerk metadata async delay
- ✅ Redirect logic too aggressive
- ✅ No timeout or state check before redirecting

## Implementation Plan

1. Add delay to onboarding redirect in AuthContext
2. OR: Only redirect from public pages
3. OR: Remove redirect, let middleware handle it
4. Test with new user onboarding flow
5. Verify navigation works immediately after onboarding

---

## ⚠️ Additional Issue Found: Cookie Mismatch

### Problem
Logs show: `cookie: 'tenant-subdomain=bitto;'` but request is for `sculptai` subdomain
- Old tenant cookies persist across subdomain switches
- Can cause data leakage or incorrect tenant context on frontend
- Cookies use `.docsflow.app` domain (shared across all subdomains)

### Root Cause
1. User switches from `bitto.docsflow.app` to `sculptai.docsflow.app`
2. Old cookies with domain `.docsflow.app` persist
3. Browser sends ALL cookies to new subdomain
4. `MultiTenantCookieManager` doesn't clear old tenant cookies on switch

### Next Step Required
Need to audit how frontend handles tenant switches and ensure cookie cleanup.

