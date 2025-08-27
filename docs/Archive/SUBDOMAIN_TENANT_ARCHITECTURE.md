# Subdomain and Tenant Architecture Documentation

## Overview
This document explains the critical architecture for handling subdomains and tenant isolation in the DocsFlow multi-tenant SaaS platform.

## System Subdomains vs Tenant Subdomains

### System Subdomains (Reserved)
The following subdomains are **RESERVED** and must **NEVER** be treated as tenant identifiers:
- `api` - API endpoints subdomain
- `www` - Main website
- `admin` - Admin panel
- `cdn` - Content delivery
- `mail` - Email services
- `support` - Support portal
- `docs` - Documentation
- `app` - Application root

### Tenant Subdomains
Any subdomain NOT in the reserved list is considered a potential tenant subdomain (e.g., `bitto`, `sculptai`, `acme-corp`).

## Architecture Components

### 1. Middleware (`/middleware.ts`)

The middleware is the first line of defense for subdomain routing:

```typescript
// CRITICAL: API subdomain bypass
if (hostname === 'api.docsflow.app' || hostname === 'api.localhost') {
  // API routes pass through WITHOUT tenant context
  return NextResponse.next();
}

// Extract tenant using security-middleware function
const tenant = extractTenantFromHostname(hostname);
```

**Key Points:**
- API subdomain is explicitly bypassed BEFORE tenant extraction
- System subdomains return `null` from `extractTenantFromHostname()`
- Only valid tenant subdomains get `x-tenant-subdomain` header set

### 2. Security Middleware (`/lib/security-middleware.ts`)

The `extractTenantFromHostname()` function filters out system subdomains:

```typescript
const systemSubdomains = ['api', 'www', 'admin', 'cdn', 'mail', 'support', 'docs'];

if (systemSubdomains.includes(subdomain)) {
  return null; // NOT a tenant
}
```

### 3. API Tenant Validation (`/lib/api-tenant-validation.ts`)

Double-checks at the API level to prevent system subdomains from being processed:

```typescript
const systemSubdomains = ['api', 'www', 'admin', 'cdn', 'mail', 'support', 'docs', 'app'];
if (tenantSubdomain && systemSubdomains.includes(tenantSubdomain.toLowerCase())) {
  return {
    isValid: false,
    error: `System subdomain '${tenantSubdomain}' is not a valid tenant`
  };
}
```

**Critical:** This function returns the tenant's **UUID**, never the subdomain string!

## Common Issues and Solutions

### Issue 1: "Invalid input syntax for type uuid: 'api'"
**Cause:** The string "api" was being used where a UUID was expected.
**Solution:** Added explicit API subdomain bypass in middleware and validation guards.

### Issue 2: Cross-tenant cookie persistence
**Cause:** Cookies set with `.docsflow.app` domain persist across all subdomains.
**Solution:** Surgical cookie scoping - only set domain when necessary for the specific context.

### Issue 3: Tenant validation on system subdomains
**Cause:** System subdomains were going through tenant validation logic.
**Solution:** Early bypass for system subdomains in middleware before any tenant logic.

## Data Flow

1. **Request arrives** at `subdomain.docsflow.app`
2. **Middleware checks:**
   - Is it a system subdomain? → Bypass tenant logic
   - Is it a tenant subdomain? → Set `x-tenant-subdomain` header
   - Is it root domain? → Handle normally
3. **API routes** receive header and validate:
   - Extract subdomain from header
   - Check against system subdomain list
   - Query database for tenant UUID
   - Use UUID for all database operations

## Database Schema

```sql
-- Tenants table uses UUID as primary key
CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subdomain TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  -- other fields...
);

-- All related tables reference tenant by UUID
CREATE TABLE documents (
  id UUID PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id),
  -- NEVER store subdomain string here!
);
```

## Testing Checklist

- [ ] API subdomain (`api.docsflow.app`) bypasses tenant validation
- [ ] System subdomains return appropriate errors if used as tenants
- [ ] Tenant subdomains correctly resolve to UUIDs
- [ ] No UUID syntax errors in logs
- [ ] Document upload works with proper tenant isolation
- [ ] Cross-tenant access is properly blocked

## Deployment Notes

When deploying changes to subdomain handling:
1. Test locally with multiple subdomains
2. Verify middleware bypass for API subdomain
3. Check that tenant validation returns UUIDs, not strings
4. Monitor logs for UUID syntax errors after deployment
5. Test document upload on production tenant

## Security Considerations

- **Never** use subdomain strings as database keys
- **Always** validate tenant access at the API level
- **Use** Row Level Security (RLS) as additional protection
- **Monitor** for unauthorized cross-tenant access attempts
- **Log** tenant validation failures for security auditing

## Maintenance Guidelines

1. **Adding new system subdomains:**
   - Add to BOTH `security-middleware.ts` AND `api-tenant-validation.ts`
   - Update this documentation
   - Test that new subdomain bypasses tenant logic

2. **Modifying tenant validation:**
   - Ensure UUID is always returned, never subdomain string
   - Maintain backward compatibility with existing headers
   - Test with production-like subdomain setup

3. **Debugging tenant issues:**
   - Check middleware logs for subdomain extraction
   - Verify API validation isn't treating system subdomains as tenants
   - Ensure database queries use UUID, not subdomain string
   - Look for "invalid input syntax for type uuid" errors

## Contact

For questions about this architecture, refer to the git history or contact the platform team.

Last Updated: 2025-01-08
