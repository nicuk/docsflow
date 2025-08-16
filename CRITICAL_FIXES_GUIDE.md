# Critical Production Fixes Guide

## 🚨 Issue 1: Vector Search Function Volatility Error

**Error:** `SET is not allowed in a non-volatile function`

**Root Cause:** PostgreSQL functions `similarity_search_optimized` and `hybrid_search_optimized` are marked as STABLE but use `SET LOCAL` commands, which require VOLATILE functions.

### Fix Instructions:

1. **Go to Supabase SQL Editor**
   - Navigate to your Supabase dashboard
   - Click on "SQL Editor" in the left sidebar

2. **Run the Migration**
   - Copy the entire contents of `migrations/fix_vector_function_volatility.sql`
   - Paste into the SQL Editor
   - Click "Run" to execute

3. **Verify the Fix**
   - Test a document search in your application
   - The "SET is not allowed" error should be resolved

### Alternative: Command Line Fix
If you have database credentials configured:
```bash
# Set environment variables
export NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
export SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Run the migration script
node scripts/apply-vector-fix.js
```

---

## ✅ Issue 2: Redis JSON Parsing Errors (FIXED)

**Error:** `Unexpected token 'o', "[object Object]" is not valid JSON`

**Root Cause:** Metrics functions were using `{}` as fallback instead of `null`, causing type mismatches when Redis operations failed.

### Fix Applied:
- Updated `lib/rag-metrics.ts` to use `null` as fallback for failed Redis operations
- Changed lines 226 and 248 from `{}` to `null`

**Status:** ✅ FIXED - No action required

---

## Testing the Fixes

### Test Vector Search:
```bash
# Test document upload and search
curl -X POST https://your-app.vercel.app/api/documents/search \
  -H "Content-Type: application/json" \
  -H "x-tenant-id: your-tenant-id" \
  -d '{"query": "test search"}'
```

### Test Redis Metrics:
```bash
# Metrics should now handle missing Redis gracefully
node test-rag-system.js
```

---

## Summary

| Issue | Status | Action Required |
|-------|--------|----------------|
| Vector Search Function Volatility | 🔧 Pending | Run SQL migration in Supabase |
| Redis JSON Parsing Errors | ✅ Fixed | None - code already updated |

## Next Steps

1. **Immediate:** Run the vector search migration in Supabase SQL Editor
2. **Monitor:** Check application logs for any remaining errors
3. **Verify:** Test document search and chat functionality

---

## Migration SQL Preview

```sql
-- Changes functions from STABLE to VOLATILE
CREATE OR REPLACE FUNCTION similarity_search_optimized(...)
LANGUAGE plpgsql VOLATILE -- Changed from STABLE
AS $$
BEGIN
  SET LOCAL hnsw.ef = 100; -- Now allowed with VOLATILE
  ...
END;
$$;

CREATE OR REPLACE FUNCTION hybrid_search_optimized(...)
LANGUAGE plpgsql VOLATILE -- Changed from STABLE
AS $$
BEGIN
  SET LOCAL hnsw.ef = 100; -- Now allowed with VOLATILE
  ...
END;
$$;
```

This migration is safe and non-destructive - it only changes function volatility settings.
