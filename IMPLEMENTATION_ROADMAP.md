# RAG Integration Implementation Roadmap

## Phase 1: Multimodal Document Parser (Days 1-2)

### Step 1.1: Create Base Parser Wrapper
```typescript
// lib/rag-multimodal-parser.ts
import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';

export interface ParsedDocument {
  text: string;
  metadata: {
    tenant_id: string;
    mime_type: string;
    tables?: any[];
    images?: any[];
    equations?: any[];
  };
  chunks: DocumentChunk[];
}

export interface DocumentChunk {
  content: string;
  type: 'text' | 'table' | 'image' | 'equation';
  metadata: Record<string, any>;
  embedding?: number[];
}

export class MultimodalDocumentParser {
  private tenantId: string;
  private supabase: any;
  private genAI: GoogleGenerativeAI;
  
  constructor(tenantId: string) {
    this.tenantId = tenantId;
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    this.genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY!);
  }
  
  async parseDocument(file: Buffer, mimeType: string): Promise<ParsedDocument> {
    // Implementation in next step
  }
}
```

### Step 1.2: Implement PDF Parser with Fallback
```typescript
// lib/parsers/pdf-parser.ts
import * as pdfParse from 'pdf-parse';

export class EnhancedPDFParser {
  async parse(buffer: Buffer, tenantId: string) {
    try {
      // Try advanced parsing first
      const data = await pdfParse(buffer);
      
      // Extract tables using regex patterns
      const tables = this.extractTables(data.text);
      
      // Extract images if present
      const images = await this.extractImages(buffer);
      
      return {
        text: data.text,
        metadata: {
          tenant_id: tenantId,
          pages: data.numpages,
          tables: tables.length,
          images: images.length
        },
        tables,
        images
      };
    } catch (error) {
      // Fallback to basic parsing
      console.warn('Advanced PDF parsing failed, using fallback', error);
      return this.basicParse(buffer, tenantId);
    }
  }
  
  private extractTables(text: string) {
    // Table extraction logic
    const tablePattern = /\|.*\|/g;
    const tables = text.match(tablePattern) || [];
    return tables.map(table => ({
      type: 'table',
      content: table,
      rows: table.split('\n').filter(row => row.includes('|'))
    }));
  }
}
```

### Step 1.3: Integrate with Existing Upload API
```typescript
// MODIFY: app/api/documents/upload/route.ts
import { MultimodalDocumentParser } from '@/lib/rag-multimodal-parser';

// Add to existing handler
export async function POST(request: Request) {
  const { tenantId } = await validateTenant(request);
  
  // Feature flag check
  const useMultimodal = process.env.FF_MULTIMODAL_PARSING === 'true';
  
  if (useMultimodal) {
    const parser = new MultimodalDocumentParser(tenantId);
    const parsed = await parser.parseDocument(fileBuffer, mimeType);
    
    // Store enhanced metadata
    await supabase
      .from('documents')
      .insert({
        ...existingData,
        metadata: parsed.metadata,
        has_tables: parsed.tables?.length > 0,
        has_images: parsed.images?.length > 0
      });
  } else {
    // Use existing parser
    await existingParser.parse(fileBuffer);
  }
}
```

## Phase 2: Knowledge Graph Integration (Days 3-5)

### Step 2.1: Create Knowledge Graph Schema
```sql
-- migrations/add_knowledge_graph.sql
CREATE TABLE IF NOT EXISTS kg_nodes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_name TEXT NOT NULL,
  properties JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS kg_edges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id TEXT NOT NULL,
  source_node_id UUID REFERENCES kg_nodes(id),
  target_node_id UUID REFERENCES kg_nodes(id),
  relationship_type TEXT NOT NULL,
  properties JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Add RLS policies
ALTER TABLE kg_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE kg_edges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation for nodes" ON kg_nodes
  FOR ALL USING (tenant_id = current_setting('app.tenant_id')::text);

CREATE POLICY "Tenant isolation for edges" ON kg_edges
  FOR ALL USING (tenant_id = current_setting('app.tenant_id')::text);
```

### Step 2.2: Implement Knowledge Graph Builder
```typescript
// lib/rag-knowledge-graph.ts
export class TenantKnowledgeGraph {
  private tenantId: string;
  private supabase: SupabaseClient;
  private genAI: GoogleGenerativeAI;
  
  async buildFromDocuments(documents: Document[]) {
    const entities = await this.extractEntities(documents);
    const relationships = await this.extractRelationships(entities);
    
    // Store in tenant-specific namespace
    await this.storeGraph(entities, relationships);
  }
  
  private async extractEntities(documents: Document[]) {
    const model = this.genAI.getGenerativeModel({ 
      model: 'gemini-2.0-flash',
      systemInstruction: 'Extract entities and their types from documents'
    });
    
    const entities = [];
    for (const doc of documents) {
      const result = await model.generateContent(doc.content);
      entities.push(...this.parseEntities(result.response.text()));
    }
    
    return entities;
  }
}
```

### Step 2.3: Hybrid Search Implementation
```typescript
// lib/rag-hybrid-search.ts
export class HybridSearchEngine {
  private vectorStore: VectorStore;
  private knowledgeGraph: TenantKnowledgeGraph;
  private reranker: HybridRAGReranker;
  
  async search(query: string, tenantId: string) {
    // Parallel search
    const [vectorResults, graphResults] = await Promise.all([
      this.vectorStore.search(query, tenantId),
      this.knowledgeGraph.traverseForQuery(query, tenantId)
    ]);
    
    // Merge and rerank
    const merged = this.mergeResults(vectorResults, graphResults);
    return this.reranker.rerank(query, merged);
  }
}
```

## Phase 3: Testing & Validation (Days 6-7)

### Step 3.1: Create Test Suite
```typescript
// test/rag-integration.test.ts
describe('Multimodal Parser', () => {
  it('maintains tenant isolation', async () => {
    const parser1 = new MultimodalDocumentParser('tenant1');
    const parser2 = new MultimodalDocumentParser('tenant2');
    
    const result1 = await parser1.parseDocument(testPDF, 'application/pdf');
    const result2 = await parser2.parseDocument(testPDF, 'application/pdf');
    
    expect(result1.metadata.tenant_id).toBe('tenant1');
    expect(result2.metadata.tenant_id).toBe('tenant2');
  });
  
  it('falls back gracefully on parser failure', async () => {
    const parser = new MultimodalDocumentParser('test');
    const result = await parser.parseDocument(corruptedPDF, 'application/pdf');
    
    expect(result).toBeDefined();
    expect(result.text).toBeTruthy();
  });
});
```

### Step 3.2: Performance Benchmarks
```typescript
// scripts/benchmark-rag.ts
async function benchmarkRAG() {
  const metrics = {
    parseTime: [],
    searchTime: [],
    accuracy: []
  };
  
  // Test with different document types
  for (const doc of testDocuments) {
    const start = Date.now();
    await parser.parseDocument(doc.buffer, doc.mimeType);
    metrics.parseTime.push(Date.now() - start);
  }
  
  console.log('Average parse time:', avg(metrics.parseTime));
  console.log('P95 parse time:', percentile(metrics.parseTime, 95));
}
```

## Phase 4: Production Rollout (Days 8-10)

### Step 4.1: Feature Flag Configuration
```typescript
// lib/feature-flags.ts
export const RAG_FEATURES = {
  MULTIMODAL_PARSING: {
    enabled: process.env.FF_MULTIMODAL === 'true',
    tenants: process.env.FF_MULTIMODAL_TENANTS?.split(',') || [],
    percentage: parseInt(process.env.FF_MULTIMODAL_PCT || '0')
  },
  KNOWLEDGE_GRAPH: {
    enabled: process.env.FF_KG === 'true',
    tenants: process.env.FF_KG_TENANTS?.split(',') || []
  }
};

export function isFeatureEnabled(feature: string, tenantId: string): boolean {
  const config = RAG_FEATURES[feature];
  if (!config?.enabled) return false;
  
  // Check tenant whitelist
  if (config.tenants.includes(tenantId)) return true;
  
  // Check percentage rollout
  if (config.percentage > 0) {
    const hash = hashCode(tenantId);
    return (hash % 100) < config.percentage;
  }
  
  return false;
}
```

### Step 4.2: Monitoring Setup
```typescript
// lib/rag-monitoring.ts
import { metrics } from '@opentelemetry/api';

const meter = metrics.getMeter('rag-system');

export const ragMetrics = {
  parseLatency: meter.createHistogram('rag.parse.latency'),
  searchLatency: meter.createHistogram('rag.search.latency'),
  parseErrors: meter.createCounter('rag.parse.errors'),
  fallbackTriggers: meter.createCounter('rag.fallback.triggers')
};

export function trackParseOperation(tenantId: string, duration: number, success: boolean) {
  ragMetrics.parseLatency.record(duration, { tenant: tenantId, success });
  if (!success) {
    ragMetrics.parseErrors.add(1, { tenant: tenantId });
  }
}
```

## Environment Variables Required

```bash
# .env.local additions
FF_MULTIMODAL_PARSING=false  # Enable multimodal parsing
FF_MULTIMODAL_TENANTS=demo-tenant,test-company  # Whitelist tenants
FF_MULTIMODAL_PCT=0  # Percentage rollout (0-100)

FF_KG=false  # Enable knowledge graph
FF_KG_TENANTS=demo-tenant  # KG whitelist

# Monitoring
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318
OTEL_SERVICE_NAME=rag-enhanced
```

## Deployment Checklist

### Week 1
- [ ] Deploy parser code with feature flag OFF
- [ ] Run migrations for KG tables
- [ ] Enable for demo-tenant only
- [ ] Monitor parse success rate
- [ ] Check tenant isolation

### Week 2
- [ ] Enable for 10% of tenants
- [ ] Monitor performance metrics
- [ ] Check fallback trigger rate
- [ ] Validate search accuracy

### Week 3
- [ ] Roll out to 50% of tenants
- [ ] Full production deployment
- [ ] Remove feature flags
- [ ] Document lessons learned

## Rollback Plan

```bash
# Quick rollback script
#!/bin/bash

# 1. Disable feature flags
export FF_MULTIMODAL_PARSING=false
export FF_KG=false

# 2. Restart services
pm2 restart all

# 3. Monitor error rates
tail -f logs/rag-errors.log

# 4. If needed, revert database
psql $DATABASE_URL < backups/pre-rag-upgrade.sql
```

## Success Criteria

- ✅ Parse success rate > 95%
- ✅ Query latency < 500ms (P95)
- ✅ Zero tenant isolation violations
- ✅ Fallback rate < 5%
- ✅ User satisfaction +20%

## Next Steps After Phase 1

1. **Batch Processing** (Week 4)
   - Implement document batch upload
   - Add queue system for large files
   
2. **Advanced VLM** (Week 5)
   - Integrate Gemini Vision for images
   - Add OCR for scanned documents

3. **Query Optimization** (Week 6)
   - Implement query caching
   - Add result pre-computation
