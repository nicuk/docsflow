# Dashboard Crash - Root Cause Analysis

## The Real Problem

**Your Clerk user account is missing `tenantId` in `publicMetadata`**

This causes the dashboard to crash because it tries to use `MultiTenantCookieManager` with `undefined` tenantId, which fails validation and causes React to error.

## Why System-Health Works But Dashboard Doesn't

### System-Health Page ✅ (Works)
- Uses `useAuth()` hook from AuthContext
- Only checks `user.role === 'admin'` for access control
- **Doesn't need tenant data** to render
- BackendStatus and SecurityMonitor don't require tenant context

### Dashboard Page ❌ (Crashes)
- Calls `/api/auth/session` directly to get tenant data
- Tries to initialize `MultiTenantCookieManager.addTenantContext()`
- **Requires valid tenantId** - crashes when it's undefined
- Uses tenant context to determine UI layout (admin vs user view)

## Timeline of Events

1. **Initial Setup**: Onboarding flow at `app/api/onboarding/complete-atomic/route.ts` sets Clerk publicMetadata:
   ```typescript
   await clerk.users.updateUserMetadata(userId, {
     publicMetadata: {
       tenantId: tenantId,              // ← Missing for your user!
       tenantSubdomain: cleanSubdomain,
       tenantName: businessName,
       role: role,
       accessLevel: accessLevel,
       onboardingComplete: true,
     }
   });
   ```

2. **Your User**: Signed up before this code existed OR metadata update failed
   - Clerk metadata: `{ onboardingComplete: true }` ✅
   - But missing: `tenantId`, `tenantSubdomain` ❌

3. **Dashboard Load**:
   ```typescript
   const userData = await fetch('/api/auth/session')
   // Returns: { user: {...}, tenant: null } ← Problem!
   
   // Dashboard tries to use it:
   MultiTenantCookieManager.addTenantContext({
     tenantId: undefined,  // ← Validation fails!
     subdomain: undefined,
     userEmail: user.email
   })
   // React error: Minified error #310 (invalid hook call)
   ```

## The Fix

Added defensive validation in dashboard that:

1. **Detects missing metadata** before it causes a crash:
   ```typescript
   if (!userData.tenant?.id || !userData.tenant?.subdomain) {
     console.error('Clerk metadata missing tenant info');
     // Clear stale cookies
     // Redirect to onboarding
     return;
   }
   ```

2. **Redirects to onboarding** to re-sync Clerk metadata
3. **Shows helpful error message** to user
4. **Clears stale cookies** that might have bad data

## How the Fix Works

**🎯 Automatic Metadata Sync (No User Action Needed)**

When the dashboard detects missing Clerk metadata:

1. **Detects the issue**:
   ```typescript
   if (!userData.tenant?.id) {
     console.warn('Clerk metadata missing tenant ID');
   ```

2. **Gets subdomain from URL**:
   ```typescript
   const currentSubdomain = window.location.hostname.split('.')[0];
   // "sculptai" from "sculptai.docsflow.app"
   ```

3. **Calls sync endpoint**:
   ```typescript
   await fetch('/api/auth/sync-metadata', {
     method: 'POST',
     body: JSON.stringify({ subdomain: 'sculptai' })
   });
   ```

4. **Sync endpoint queries database**:
   ```sql
   SELECT id, name FROM tenants WHERE subdomain = 'sculptai';
   SELECT role, access_level FROM users WHERE email = 'user@example.com';
   ```

5. **Updates Clerk metadata**:
   ```typescript
   await clerk.users.updateUserMetadata(userId, {
     publicMetadata: {
       tenantId: "abc-123...",
       tenantSubdomain: "sculptai",
       role: "admin",
       accessLevel: 1
     }
   });
   ```

6. **Reloads page** - dashboard works!

### Manual Fix (If Auto-Sync Fails)

If you have admin access to Clerk dashboard:
1. Go to Clerk Dashboard → Users → Find your user
2. Edit Public Metadata
3. Add:
   ```json
   {
     "tenantId": "YOUR_TENANT_UUID",
     "tenantSubdomain": "sculptai",
     "tenantName": "Sculptai",
     "role": "admin",
     "accessLevel": 1,
     "onboardingComplete": true
   }
   ```
4. Get `YOUR_TENANT_UUID` from Supabase:
   ```sql
   SELECT id FROM tenants WHERE subdomain = 'sculptai';
   ```

## Prevention

To prevent this for other users:

1. **Always check Clerk metadata** after onboarding completes
2. **Add retry logic** if metadata update fails
3. **Add health check endpoint** that validates Clerk metadata matches database
4. **Show onboarding status** in admin panel

## Files Modified

1. **`app/dashboard/page.tsx`**
   - Added validation before using tenant data
   - Added automatic metadata sync when Clerk metadata missing
   - Calls `/api/auth/sync-metadata` to fix out-of-sync data
   - Gracefully handles sync failures

2. **`app/api/auth/sync-metadata/route.ts`** (NEW)
   - Queries database to get tenant info from subdomain
   - Verifies user belongs to tenant
   - Updates Clerk publicMetadata with correct tenant data
   - Returns success/failure status

## Testing

After applying the fix:
1. Load dashboard at `https://sculptai.docsflow.app/dashboard`
2. Dashboard detects missing Clerk metadata
3. Automatically calls sync endpoint
4. Clerk metadata updated from database
5. Page reloads - dashboard works normally

**No user interaction required!**

## Related Files
- `app/api/auth/session/route.ts` - Returns Clerk metadata
- `app/api/onboarding/complete-atomic/route.ts` - Sets Clerk metadata
- `contexts/AuthContext.tsx` - Alternative auth flow (used by system-health)
- `lib/multi-tenant-cookie-manager.ts` - Validates tenant data

