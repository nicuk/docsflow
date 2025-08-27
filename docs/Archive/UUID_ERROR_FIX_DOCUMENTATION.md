# UUID Error Fix Documentation

## Critical Issue: "invalid input syntax for type uuid: 'api'"

### Problem Summary
The system was attempting to use the string "api" (from api.docsflow.app subdomain) as a UUID in database queries, causing persistent PostgreSQL errors.

### Root Cause
**Dual tenant extraction methods were conflicting:**

1. **Correct Method**: `validateTenantContext()` from `/lib/api-tenant-validation.ts`
   - Returns validated tenant UUID from database
   - Properly excludes system subdomains (api, www, app, etc.)
   - Returns actual UUID like `550e8400-e29b-41d4-a716-446655440000`

2. **Incorrect Method**: `extractTenantFromRequest()` from `/lib/auth-helpers.ts`
   - Extracts subdomain string directly from hostname
   - Returns "api" for api.docsflow.app
   - Returns subdomain string, NOT a UUID

### The Bug
API routes were using BOTH methods:
```typescript
// WRONG: This was happening in multiple routes
const tenantValidation = await validateTenantContext(request); // Gets UUID correctly
const tenantId = extractTenantFromRequest(request); // OVERWRITES with "api" string!
```

The second call would overwrite the correct UUID with the subdomain string "api", which then failed when used in database queries expecting a UUID.

## Files Fixed

### 1. `/app/api/chat/route.ts`
**Before:**
```typescript
const tenantSubdomain = tenantValidation.tenantId!;
// ... later in code ...
const tenantId = extractTenantFromRequest(request); // BUG: Returns "api" string
```

**After:**
```typescript
const tenantId = tenantValidation.tenantId!;  // This is the UUID
const tenantSubdomain = tenantValidation.tenantData?.subdomain || 'unknown';
// REMOVED: extractTenantFromRequest - we already have the UUID from validation
```

### 2. `/app/api/documents/upload/route.ts`
**Before:**
```typescript
const tenantId = extractTenantFromRequest(request); // BUG: Returns "api" string
```

**After:**
```typescript
const tenantValidation = await validateTenantContext(request, {
  requireAuth: false
});
const tenantId = tenantValidation.tenantId!; // This is the UUID
```

### 3. `/app/api/conversations/[id]/route.ts`
**Before:**
```typescript
const tenantId = extractTenantFromRequest(request); // BUG: Returns "api" string
```

**After:**
```typescript
const tenantValidation = await validateTenantContext(request, {
  requireAuth: false
});
const tenantId = tenantValidation.tenantId!; // This is the UUID
```

## Key Learnings

### 1. Always Use Validated UUIDs for Database Queries
- Database expects UUID type: `550e8400-e29b-41d4-a716-446655440000`
- Never use subdomain strings: "api", "bitto", "demo"
- Always validate through `validateTenantContext()`

### 2. System Subdomains Must Be Excluded
System subdomains that should NEVER be treated as tenants:
- `api.docsflow.app` - API endpoints
- `www.docsflow.app` - Marketing site
- `app.docsflow.app` - Main application
- `docsflow.app` - Root domain

### 3. Proper Tenant Validation Flow
```typescript
// 1. Validate tenant context (includes system subdomain checks)
const tenantValidation = await validateTenantContext(request, {
  requireAuth: false // or true for production
});

// 2. Check if validation passed
if (!tenantValidation.isValid) {
  return NextResponse.json(
    { error: tenantValidation.error },
    { status: tenantValidation.statusCode || 400 }
  );
}

// 3. Use the validated UUID for ALL database operations
const tenantId = tenantValidation.tenantId!; // UUID
const tenantSubdomain = tenantValidation.tenantData?.subdomain; // String
```

## Testing the Fix

### 1. Test API Subdomain Bypass
```bash
# Should NOT cause UUID errors
curl https://api.docsflow.app/health
```

### 2. Test Valid Tenant Subdomain
```bash
# Should work with proper tenant UUID
curl https://bitto.docsflow.app/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "test"}'
```

### 3. Monitor Logs
Check Vercel logs for absence of:
- `invalid input syntax for type uuid: "api"`
- `invalid input syntax for type uuid: "www"`
- Any subdomain string being used as UUID

## Prevention Guidelines

### DO ✅
- Always use `validateTenantContext()` for tenant validation
- Use the returned `tenantId` (UUID) for database queries
- Use the returned `tenantData.subdomain` for display/logging
- Add system subdomain checks in middleware and validation

### DON'T ❌
- Never use `extractTenantFromRequest()` for getting tenant IDs
- Never pass subdomain strings to database queries
- Never assume subdomain = tenant
- Never bypass tenant validation for API routes

## Related Files
- `/lib/api-tenant-validation.ts` - Central tenant validation
- `/middleware.ts` - First-line subdomain routing
- `/lib/utils.ts` - `extractTenantFromHostname()` helper
- `/docs/SUBDOMAIN_TENANT_ARCHITECTURE.md` - Architecture overview

## Deployment Status
- Fix committed: 2025-01-15
- Deployed to production via Vercel auto-deployment
- Monitoring required for 24-48 hours to confirm resolution

## Future Improvements
1. Remove or deprecate `extractTenantFromRequest()` function
2. Add TypeScript types to enforce UUID vs string distinction
3. Add unit tests for tenant validation edge cases
4. Consider adding database constraints to prevent non-UUID values
