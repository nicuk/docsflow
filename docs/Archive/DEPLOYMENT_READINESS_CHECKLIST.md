# RAG System HNSW Migration - Deployment Readiness Checklist

## Pre-Deployment Verification

### 1. Database Migration Files ✅
- [x] `upgrade_to_hnsw_FIXED.sql` - Fixed UUID syntax errors, proper HNSW indexes
- [x] `cleanup_redundant_indexes.sql` - Removes old IVFFlat and duplicate indexes
- [ ] **ACTION REQUIRED**: Test with real tenant UUIDs (replace placeholder values)

### 2. Application Code Updates ✅
- [x] `lib/hybrid-search.ts` - Updated to use `tenant_filter` (UUID) and `access_level_filter`
- [x] `lib/semantic-reranking.ts` - Gemini Flash integration for relevance scoring
- [x] `lib/embedding-cache.ts` - Redis caching for embeddings
- [x] `lib/query-enhancement.ts` - Query preprocessing pipeline
- [x] `lib/rag-metrics.ts` - Performance monitoring system
- [x] `lib/performance-optimizer.ts` - Frontend performance fixes

### 3. Critical Fixes Applied ✅
- [x] UUID type alignment (tenant_id as UUID, not text)
- [x] Function signature updates (tenant_filter, access_level_filter)
- [x] React imports fixed in performance-optimizer
- [x] TypeScript errors resolved

## Deployment Steps

### Phase 1: Staging Environment Testing
```bash
# 1. Backup current database
pg_dump -h <host> -U <user> -d <database> > backup_$(date +%Y%m%d_%H%M%S).sql

# 2. Run HNSW migration
psql -h <host> -U <user> -d <database> -f migrations/upgrade_to_hnsw_FIXED.sql

# 3. Verify migration success
psql -h <host> -U <user> -d <database> -c "
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'document_chunks';
"

# 4. Test with real tenant UUID
psql -h <host> -U <user> -d <database> -c "
SELECT * FROM similarity_search(
  (SELECT embedding FROM document_chunks LIMIT 1)::vector(768),
  0.7,
  10,
  'YOUR-REAL-TENANT-UUID'::uuid,
  3
);
"
```

### Phase 2: Index Cleanup
```bash
# 1. Analyze query plans before cleanup
psql -h <host> -U <user> -d <database> -c "
EXPLAIN (ANALYZE, BUFFERS) 
SELECT * FROM document_chunks 
WHERE tenant_id = 'YOUR-TENANT-UUID'::uuid 
  AND access_level <= 3;
"

# 2. Run cleanup migration
psql -h <host> -U <user> -d <database> -f migrations/cleanup_redundant_indexes.sql

# 3. Update table statistics
psql -h <host> -U <user> -d <database> -c "
VACUUM ANALYZE document_chunks;
"
```

### Phase 3: Application Deployment
```bash
# 1. Build application
npm run build

# 2. Run tests
npm test

# 3. Deploy to staging
vercel --prod=false

# 4. Monitor metrics endpoint
curl https://staging.docsflow.app/api/rag/metrics
```

## Performance Benchmarks

### Expected Improvements
- **Vector Search**: 3-5x faster with HNSW vs IVFFlat
- **Cache Hit Rate**: ~60% reduction in embedding API calls
- **Query Latency**: <200ms p95 (from ~500ms)
- **Relevance Score**: +25% improvement with reranking

### Monitoring Commands
```sql
-- Check index usage
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_scan,
  idx_tup_read,
  idx_tup_fetch
FROM pg_stat_user_indexes
WHERE tablename = 'document_chunks'
ORDER BY idx_scan DESC;

-- Monitor query performance
SELECT 
  calls,
  mean_exec_time,
  max_exec_time,
  total_exec_time,
  query
FROM pg_stat_statements
WHERE query LIKE '%similarity_search%'
ORDER BY mean_exec_time DESC;
```

## Rollback Plan

### If Issues Occur:
```sql
-- 1. Restore old similarity_search function
CREATE OR REPLACE FUNCTION similarity_search(
  query_embedding vector(768),
  match_threshold float,
  match_count int,
  tenant_id_filter text DEFAULT NULL
) -- Original signature

-- 2. Recreate IVFFlat index if needed
CREATE INDEX idx_document_chunks_embedding_ivfflat 
ON document_chunks 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- 3. Restore from backup if critical
psql -h <host> -U <user> -d <database> < backup_YYYYMMDD_HHMMSS.sql
```

## Sign-off Checklist

- [ ] Database backup completed
- [ ] Staging environment tested
- [ ] Real tenant UUIDs verified
- [ ] Performance benchmarks met
- [ ] Monitoring dashboards ready
- [ ] Rollback plan documented
- [ ] Team notified of deployment window

## Notes
- Keep SQL migration files local (not in git) for manual control
- Monitor error logs during first 24 hours post-deployment
- Have DBA on standby during migration window
