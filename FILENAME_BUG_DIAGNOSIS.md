# Filename "Unknown" Bug Diagnosis

## Problem
DOCX files showing as "Unknown" in chat interface, but PNG images show correct filenames.

## Current Status

### ✅ Database Layer: WORKING
The `similarity_search` SQL function correctly returns `filename`:
```sql
SELECT * FROM similarity_search(...);
-- Returns: filename: "Master SEO Prompt .docx" ✅
```

### ✅ Application Mapping: LOOKS CORRECT
`lib/rag-hybrid-reranker.ts` line 543:
```typescript
provenance: {
  source: d.filename || d.document_metadata?.filename || 'Unknown Document',
  ...
}
```

### ✅ Chat API Mapping: LOOKS CORRECT  
`app/api/chat/route.ts` line 240:
```typescript
const documentName = source.source || source.provenance?.source || source.metadata?.filename || 'Unknown Document';
```

## Hypothesis

**Most likely cause:** Old cached results or dev server not restarted after migration.

### Evidence:
1. SQL query returns filename ✅
2. TypeScript mapping checks `source.provenance?.source` ✅  
3. But UI still shows "Unknown" ❌

## Next Steps to Debug

1. **Restart dev server** (kills any in-memory caches)
2. **Hard refresh browser** (Ctrl+Shift+R)
3. **Test with a NEW query** (not from browser autocomplete)
4. **Add console.log to chat API:**
   ```typescript
   console.log('RAG Response sources:', JSON.stringify(ragResponse.sources?.[0], null, 2));
   ```
5. **Check browser DevTools Network tab** to see actual API response

## If Still Broken After Restart

Possible issues:
- Frontend is using a different API endpoint
- There's a service worker caching old responses
- The `SearchResult` TypeScript interface is missing `provenance` field
- Category boost is accidentally stripping provenance (unlikely based on code review)

## Old vs New Images

⚠️ **CRITICAL:** All current images in database still have POLLUTED embeddings:
```
"Here's a detailed analysis of the image:"
"Here's a breakdown of the image:"
```

These were uploaded BEFORE the `ImageProcessor` fix!

**Required actions:**
1. Delete all old images
2. Restart dev server  
3. Re-upload images (will use new clean extraction)
4. Test with "what about the SEO file I uploaded?"

