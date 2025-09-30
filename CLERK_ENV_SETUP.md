# 🔐 Clerk Environment Setup (Phase 2)

## Required Environment Variables

Add these to your `.env.local` file:

```bash
# ===================================
# CLERK CONFIGURATION (Phase 2 Test)
# ===================================

# Get these from: https://dashboard.clerk.com
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# Feature flag - Controls which auth provider to use
# false = Supabase (default, current production)
# true = Clerk (for testing only)
NEXT_PUBLIC_USE_CLERK=false

# Clerk URLs (isolated test routes)
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in-clerk
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up-clerk
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard-clerk
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard-clerk
```

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
