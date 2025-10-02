# Dashboard Crash Fix - Data Structure Mismatch

## Problem
After moving super admin components (`BackendStatus` and `SecurityMonitor`) from `/dashboard` to `/dashboard/admin/system-health`, the main dashboard page crashed with:

```
Application error: a client-side exception has occurred
MultiTenantCookieManager - Invalid tenant data: {tenantId: undefined, subdomain: 'sculptai'}
Minified React error #310
```

## Root Cause

**Data Structure Mismatch Between API Response and Dashboard Code**

The `/api/auth/session` endpoint returns tenant data in this structure:
```typescript
{
  authenticated: true,
  user: { id, email, name, role },
  tenant: { id, subdomain, name },  // ✅ Nested under 'tenant'
  onboardingComplete: boolean
}
```

But the dashboard code was trying to access:
```typescript
userData.tenantId  // ❌ This doesn't exist!
userData.email     // ❌ This doesn't exist!
```

When it should have been:
```typescript
userData.tenant?.id       // ✅ Correct path
userData.user?.email      // ✅ Correct path
```

## Why It Manifested After Moving Components

This bug was **always present** but went unnoticed because:
1. The code paths that used `tenantId` had fallback logic
2. The MultiTenantCookieManager validation was relaxed to "allow" undefined values
3. When the admin components were moved, the dashboard rendering path changed slightly, exposing the bug

The crash occurred specifically when:
- User had admin role (accessLevel === 1)
- Dashboard tried to create TenantContext with `undefined` tenantId
- MultiTenantCookieManager logged the error and React's hydration failed

## Fixes Applied

### 1. Fixed Tenant ID Access (Line 204)
```typescript
// ❌ BEFORE
tenantId: userData.tenantId,

// ✅ AFTER
tenantId: userData.tenant?.id || '',
```

### 2. Fixed Email Access (Lines 193, 224, 244)
```typescript
// ❌ BEFORE
email: userData.email,
userEmail: userData.email

// ✅ AFTER
email: userData.user?.email,
userEmail: userData.user?.email || ''
```

### 3. Fixed Tenant Data Validation (Line 218)
```typescript
// ❌ BEFORE
if (userData.tenantId && userData.tenant?.subdomain && ...)

// ✅ AFTER
if (userData.tenant?.id && userData.tenant?.subdomain && ...)
```

### 4. Fixed Diagnostic Logging (Lines 236-237)
```typescript
// ❌ BEFORE
tenantId: userData.tenantId,

// ✅ AFTER
tenantId: userData.tenant?.id,
```

### 5. Removed Unused Imports (Lines 45-46)
```typescript
// ❌ BEFORE - Unused imports
import BackendStatus from "@/components/backend-status"
import { SecurityMonitor } from "@/components/security-monitor"

// ✅ AFTER - Removed since components moved to /dashboard/admin/system-health
```

## Impact
- ✅ Dashboard now loads without crashing
- ✅ Tenant context correctly set from API response
- ✅ MultiTenantCookieManager receives valid data
- ✅ Admin users can access dashboard and system-health page
- ✅ No linter errors

## Prevention
To prevent similar issues:
1. **Type Safety**: Add TypeScript interfaces for API responses
2. **Validation**: Add runtime validation for API response structure
3. **Testing**: Add integration tests that verify data flow from API → Dashboard
4. **Monitoring**: Log when tenant data is undefined/invalid

## Files Fixed
1. **`app/dashboard/page.tsx`** - Fixed 5 instances of incorrect data access
   - `userData.tenantId` → `userData.tenant?.id`
   - `userData.email` → `userData.user?.email`
   - Removed unused imports (`BackendStatus`, `SecurityMonitor`)

2. **`utils/redirect-handler.ts`** - Fixed tenant ID check
   - `userData.tenantId` → `userData.tenant?.id`

3. **`app/onboarding/page.tsx`** - Fixed email access
   - `userData.email` → `userData.user?.email`

## Related Files (No Changes Needed)
- `app/api/auth/session/route.ts` - Reference for correct response structure
- `app/api/auth/saml/callback/[tenantId]/route.ts` - Uses different userData structure (SAML)
- `app/dashboard/admin/system-health/page.tsx` - New location of admin components
- `lib/multi-tenant-cookie-manager.ts` - Tenant validation logic

