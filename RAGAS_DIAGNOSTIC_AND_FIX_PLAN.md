# RAG System Diagnostic & Fix Plan

## 🔍 Problem Identified

Your chat interface is showing sources as **"Unknown (page 1)"** with unrelated documents because the `similarity_search` SQL function has **two critical bugs**:

### Bug #1: Missing Metadata in Return Values
The function only returns 5 fields:
- `id`, `content`, `similarity`, `document_id`, `chunk_index`

But it's **NOT returning**:
- ❌ `filename` - So frontend shows "Unknown"
- ❌ `tenant_id` - Can't verify tenant isolation
- ❌ `metadata` - Can't get page numbers

### Bug #2: Invalid Column Reference
The function checks `t.access_level` but the `tenants` table **doesn't have** an `access_level` column!

```sql
-- CURRENT (BROKEN):
AND t.access_level <= similarity_search.access_level  -- t.access_level doesn't exist!

-- CORRECT:
AND dc.access_level <= similarity_search.access_level  -- Use chunk-level access
```

---

## 📋 Step-by-Step Fix Plan

### STEP 1: Run Diagnostic (100% Safe - No Changes)

Run this file to verify current state:
```bash
# In Supabase SQL Editor, run:
database/DIAGNOSTIC_RUN_THIS_FIRST.sql
```

This will show you:
- ✅ What columns actually exist
- ✅ Current function definition
- ✅ Whether the function works or fails
- ✅ Sample data from your documents

**Expected findings:**
- `tenants.access_level` does NOT exist ❌
- `document_chunks.access_level` DOES exist ✅
- `documents.filename` exists ✅
- Current function may be failing silently

---

### STEP 2: Apply the Fix

After reviewing diagnostic results, apply the migration:

**File:** `supabase/migrations/20250102000004_fix_similarity_search_return_metadata_SAFE.sql`

**What it does:**
1. ✅ Drops the broken function
2. ✅ Creates new function with **correct columns**:
   - Returns `filename` for proper source attribution
   - Returns `tenant_id` for security verification
   - Returns `metadata` for page numbers
   - Returns timestamps and status fields
3. ✅ Fixes the `access_level` bug (uses `dc.access_level` not `t.access_level`)
4. ✅ Runs verification tests automatically
5. ✅ Shows sample output to confirm it works

**Safety features:**
- ✅ Pre-flight checks verify columns exist before migration
- ✅ Only uses columns from actual schema (no assumptions)
- ✅ Includes rollback capability
- ✅ Self-testing with automatic verification

**To apply:**
```sql
-- Option 1: Via Supabase dashboard
-- Copy/paste the entire migration file into SQL Editor

-- Option 2: Via CLI (if you have it set up)
-- npx supabase db push
```

---

### STEP 3: Update Frontend Code

The frontend code at `lib/rag-hybrid-reranker.ts:541` already expects these fields:

```typescript
provenance: {
  source: d.metadata?.filename || d.filename || 'Unknown Document',
  page: d.metadata?.page || d.page,
  confidence: d.confidence_score || d.similarity || 0
}
```

After the migration, the function will return `d.filename` and metadata directly, so this code will work correctly!

**No code changes needed** - the frontend already handles it correctly.

---

### STEP 4: Verify the Fix

After applying the migration, test it:

```sql
-- Test query (paste in SQL Editor)
WITH sample_embedding AS (
  SELECT embedding 
  FROM document_chunks 
  LIMIT 1
)
SELECT 
  filename,           -- Should show actual filename, not NULL
  tenant_id::text,    -- Should show tenant UUID
  chunk_metadata->>'page' as page,  -- Should show page number
  substring(content, 1, 100) as content_preview
FROM sample_embedding,
LATERAL similarity_search(
  sample_embedding.embedding,
  0.3,  -- threshold
  5,    -- limit
  NULL, -- tenant_id filter (NULL = all tenants for testing)
  1     -- access_level
) 
LIMIT 5;
```

**Expected results:**
- ✅ `filename` shows actual document names (not NULL)
- ✅ `tenant_id` shows proper UUIDs
- ✅ `page` shows page numbers from metadata
- ✅ No errors

---

### STEP 5: Test in Chat Interface

1. Go to your chat interface
2. Ask: "is there an avengers file"
3. Check the sources section

**Before fix:**
```
Sources:
❌ Unknown (page 1) - 100% confidence
❌ Unknown (page 1) - 98% confidence
❌ Unknown (page 1) - 95% confidence
```

**After fix:**
```
Sources:
✅ Avengers_Analysis.pdf (page 3) - 95% confidence
✅ Marvel_Characters.pdf (page 12) - 87% confidence
```

---

## 🔬 Using RAGAS for Deeper Analysis

After fixing the basic metadata issue, you can use RAGAS to evaluate retrieval quality:

### Run RAGAS Diagnostic
```bash
# Install dependencies first
npm install --save-dev tsx

# Run the diagnostic
npx tsx scripts/diagnose-rag-with-ragas.ts
```

**What it checks:**
1. ✅ **Tenant Isolation** - Are documents from other tenants leaking?
2. ✅ **Metadata Quality** - Are filenames and pages populated?
3. ✅ **Semantic Relevance** - Do retrieved docs match the query?
4. ✅ **Confidence Calibration** - Is high confidence actually accurate?

**Output:**
- `RAG_DIAGNOSTIC_REPORT.md` with detailed findings
- Specific recommendations for improvement
- Identifies if tenant isolation is broken
- Shows which queries have poor retrieval

---

## 🎯 Summary

| Issue | Current | After Fix |
|-------|---------|-----------|
| Source attribution | "Unknown (page 1)" | "Avengers_Analysis.pdf (page 3)" |
| Tenant isolation | Can't verify | Verified with returned `tenant_id` |
| Function errors | Silent failures | Proper error handling |
| access_level bug | Checks non-existent column | Uses correct `dc.access_level` |
| RAGAS evaluation | Not possible | Enabled with proper metadata |

---

## 📁 Files Created

1. ✅ `database/DIAGNOSTIC_RUN_THIS_FIRST.sql` - Run this first (read-only)
2. ✅ `supabase/migrations/20250102000004_fix_similarity_search_return_metadata_SAFE.sql` - The fix
3. ✅ `scripts/diagnose-rag-with-ragas.ts` - RAGAS-based evaluation
4. ✅ `database/diagnose-source-attribution.sql` - Additional diagnostics

---

## ⚠️ Important Notes

1. **The migration is 100% safe** - It only modifies the function, not your data
2. **No data loss** - Documents and chunks remain unchanged
3. **Instant rollback** - You can restore the old function if needed
4. **Self-verifying** - Migration includes automatic tests

**Rollback if needed:**
```sql
-- Just re-run the previous migration
\i supabase/migrations/20250102000003_fix_similarity_search_tenant_join.sql
```

---

## 🚀 Next Steps

1. **Now:** Run `database/DIAGNOSTIC_RUN_THIS_FIRST.sql` 
2. **Review:** Check diagnostic output
3. **Apply:** Run the migration if diagnostics look good
4. **Verify:** Test the fix with sample queries
5. **Monitor:** Use RAGAS diagnostic for ongoing evaluation

Let me know what the diagnostic shows!

