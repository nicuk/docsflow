# Navigation Debug Plan - Links Not Working

## Symptoms
- ❌ Sidebar navigation links don't work (Documents, Chat, Settings)
- ❌ Dropdown menu items don't work (Profile, Billing, Settings)
- ✅ Logout button DOES work
- ✅ Worked with Supabase, broke after Clerk migration

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

