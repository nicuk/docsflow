# 🎯 Clerk Migration Plan (Surgical Approach)

## ✅ **Phase 0: Analysis Complete**

### Current State:
- **52 files** using Supabase auth (`supabase.auth.*`)
- **130+ references** to Supabase auth methods
- **Working**: Supabase DB with RLS, tenants, documents
- **Broken**: Token expiration, cookie domain, session persistence

### Goal:
- Replace Supabase Auth with Clerk Auth
- **Keep** Supabase for database/RLS
- Maintain zero downtime
- Surgical, testable, reversible

---

## 🔧 **Phase 1: Foundation (Isolation Layer)**

### 1.1 Create Auth Abstraction
**File**: `lib/auth/auth-provider.ts`
```typescript
// Abstraction layer that works with BOTH Supabase and Clerk
export interface AuthUser {
  id: string
  email: string
  name?: string
  metadata?: Record<string, any>
}

export interface AuthProvider {
  getCurrentUser(): Promise<AuthUser | null>
  signIn(email: string, password: string): Promise<AuthUser>
  signOut(): Promise<void>
  isAuthenticated(): Promise<boolean>
}

// Factory pattern - switches based on env var
export function createAuthProvider(): AuthProvider {
  const useClerk = process.env.NEXT_PUBLIC_USE_CLERK === 'true'
  return useClerk ? new ClerkAuthProvider() : new SupabaseAuthProvider()
}
```

### 1.2 Feature Flag
**File**: `.env.local`
```bash
# Feature flag for auth migration
NEXT_PUBLIC_USE_CLERK=false  # Start with false
```

### 1.3 Supabase Adapter (Keep Existing Working)
**File**: `lib/auth/supabase-auth-provider.ts`
```typescript
export class SupabaseAuthProvider implements AuthProvider {
  // Wrap existing Supabase auth logic
}
```

### 1.4 Clerk Adapter (New Implementation)
**File**: `lib/auth/clerk-auth-provider.ts`
```typescript
export class ClerkAuthProvider implements AuthProvider {
  // New Clerk implementation
}
```

**Success Criteria:**
- ✅ Code compiles
- ✅ Existing Supabase auth still works
- ✅ No runtime errors
- ✅ Feature flag toggles cleanly

---

## 🧪 **Phase 2: Parallel Testing Route**

### 2.1 Create Test Route
**File**: `app/dashboard-clerk/page.tsx`
```typescript
// Test dashboard using Clerk
// Completely isolated from existing dashboard
```

### 2.2 Test Middleware
**File**: `middleware-clerk.ts`
```typescript
// New Clerk middleware (doesn't affect existing middleware.ts)
```

### 2.3 Test Sign-in
**File**: `app/sign-in-clerk/page.tsx`
```typescript
// Clerk sign-in (doesn't affect existing /login)
```

**Success Criteria:**
- ✅ Can access `/dashboard-clerk` with Clerk auth
- ✅ Can access `/dashboard` with Supabase auth
- ✅ Both work simultaneously
- ✅ No cross-contamination

---

## 🔄 **Phase 3: Gradual Migration**

### 3.1 Update Components One by One
**Order:**
1. Dashboard page (using auth adapter)
2. Documents page
3. Chat page
4. Settings page

**Pattern:**
```typescript
// OLD
const { data: { user } } = await supabase.auth.getUser()

// NEW
const user = await authProvider.getCurrentUser()
```

### 3.2 Update API Routes One by One
**Order:**
1. `/api/auth/session`
2. `/api/documents`
3. `/api/chat`
4. `/api/conversations`

**Success Criteria:**
- ✅ Each component works with BOTH providers
- ✅ Tests pass for each migration
- ✅ Can roll back any step independently

---

## 🚀 **Phase 4: Clerk Activation**

### 4.1 User Data Sync
**File**: `lib/clerk-sync.ts`
```typescript
// Clerk webhook to sync users to Supabase DB
// Maintains RLS and tenant associations
```

### 4.2 Flip Feature Flag
```bash
NEXT_PUBLIC_USE_CLERK=true
```

### 4.3 Monitor & Validate
- Check logs for auth errors
- Verify Organizations work
- Test subdomain routing
- Validate multi-tenancy

**Success Criteria:**
- ✅ All existing features work with Clerk
- ✅ No auth errors in logs
- ✅ Users can log in and access their data
- ✅ Organizations/tenants work correctly

---

## 🧹 **Phase 5: Cleanup**

### 5.1 Remove Supabase Auth Code
- Delete `SupabaseAuthProvider`
- Remove Supabase auth dependencies
- Clean up old login/register routes

### 5.2 Simplify
- Remove feature flag
- Remove abstraction (direct Clerk usage)
- Update documentation

---

## 📊 **Rollback Plan**

At any point, rollback by:
1. Set `NEXT_PUBLIC_USE_CLERK=false`
2. Restart server
3. Existing Supabase auth takes over

---

## ⏱️ **Timeline**

- **Phase 1**: 2 hours (abstraction layer)
- **Phase 2**: 1 hour (test route)
- **Phase 3**: 4 hours (gradual migration)
- **Phase 4**: 1 hour (activation)
- **Phase 5**: 1 hour (cleanup)

**Total**: ~9 hours of focused work

---

## 🎯 **Current Status: READY TO START**

Next step: Begin Phase 1 - Create auth abstraction layer
