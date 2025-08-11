# CRITICAL FIX: Service Role Authentication Issue

## Problem
The API is using `createServerClient` with cookies, which overrides the service role key and uses user session instead.

## Root Cause
```typescript
// WRONG: This uses cookies and ignores service role key
const adminSupabase = createServerClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  serviceRoleKey,
  { cookies: { ... } } // ❌ This overrides service role
);
```

## Solution
Replace with direct client creation for service role operations:

```typescript
// CORRECT: Direct client without cookies for service role
import { createClient } from '@supabase/supabase-js';

const adminSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
  // No cookies - uses service role directly
);
```

## File to Fix
`/app/api/onboarding/complete/route.ts` - Line 133

## Expected Result
- API will run as service_role
- RLS policies will allow tenant creation
- Onboarding will work immediately

## One-Line Fix
Replace the `createServerClient` call with `createClient` for admin operations.
