# 🔐 Clerk Environment Setup (Phase 2)

## Required Environment Variables

Add these to your `.env.local` file:

```bash
# ===================================
# EXISTING SUPABASE (Keep these!)
# ===================================
NEXT_PUBLIC_SUPABASE_URL=your_existing_value
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_existing_value
SUPABASE_SERVICE_ROLE_KEY=your_existing_value

# ===================================
# CLERK CONFIGURATION (Phase 2 Test)
# ===================================

# From your Clerk dashboard (you have these!):
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_your-key-here
CLERK_SECRET_KEY=sk_test_your-key-here

# Feature flag - Controls which auth provider to use
# CRITICAL: Keep this FALSE for now!
# false = Supabase (production - keep working)
# true = Clerk (breaks production - only for Phase 4)
NEXT_PUBLIC_USE_CLERK=false

# Clerk URLs (isolated test routes - no impact on main app)
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in-clerk
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up-clerk
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard-clerk
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard-clerk
```

### ⚠️ IMPORTANT: Don't Follow Clerk's Quickstart Yet!

Clerk's quickstart wants you to:
1. Replace your middleware with `clerkMiddleware()` ❌ **DON'T DO THIS**
2. Wrap entire app with `ClerkProvider` ❌ **DON'T DO THIS**
3. Replace all auth routes ❌ **DON'T DO THIS**

**Why?** This would break your existing Supabase auth and prevent deployment!

**Our surgical approach:**
- ✅ Test Clerk in isolated routes (`/dashboard-clerk`)
- ✅ Keep production working (`/dashboard` uses Supabase)
- ✅ Migrate gradually (Phase 3-5)

## Setup Steps

1. **Create Clerk Account**
   - Go to https://dashboard.clerk.com
   - Sign up for free account
   - Create new application

2. **Get API Keys**
   - Copy `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` (starts with `pk_test_`)
   - Copy `CLERK_SECRET_KEY` (starts with `sk_test_`)

3. **Add to .env.local**
   - Paste the keys from above
   - Keep `NEXT_PUBLIC_USE_CLERK=false` (Supabase remains active)

4. **Test Clerk Routes (Isolated)**
   - `/sign-in-clerk` - Clerk login page
   - `/sign-up-clerk` - Clerk registration page
   - `/dashboard-clerk` - Clerk dashboard (test only)

5. **Verify No Impact**
   - `/login` - Still uses Supabase ✅
   - `/dashboard` - Still uses Supabase ✅
   - `/register` - Still uses Supabase ✅

## Testing Clerk

```bash
# Start dev server
npm run dev

# Visit Clerk test routes:
# http://localhost:3000/sign-in-clerk
# http://localhost:3000/dashboard-clerk
```

## Rollback Anytime

If anything breaks, just remove the Clerk keys from `.env.local` and restart the server. Your existing Supabase auth continues working.

## Phase 3: Gradual Migration

After Phase 2 testing succeeds, we'll:
1. Flip `NEXT_PUBLIC_USE_CLERK=true` to test the main app with Clerk
2. Migrate components one by one
3. Keep rollback capability at all times
