# Advanced RAG Techniques from Open-Source Repos
## Solutions for DocsFlow's Retrieval Quality Issues

**Your Current Problems:**
1. ❌ LLM summaries polluting embeddings → Generic documents score high
2. ❌ "Avengers" query returns water meter data → Poor semantic matching
3. ❌ Low confidence in correct results → Ranking issues

**Repositories Analyzed:**
1. **RAGFlow** (infiniflow) - 65K stars, TypeScript
2. **LightRAG** (HKUDS) - 21K stars, Python, EMNLP 2025
3. **RagaAI-Catalyst** (raga-ai-hub) - 16K stars, Monitoring framework
4. **RAG-Anything** (HKUDS) - 7.8K stars, All-in-one framework
5. **RAG_Techniques** (NirDiamant) - Advanced techniques showcase

---

## 🔥 CRITICAL TECHNIQUES YOU SHOULD STEAL

### 1. LightRAG: Graph-Based Dual-Level Retrieval (SOLVES YOUR PROBLEM)

**What They Do Differently:**

Instead of embedding whole chunks, they create a **knowledge graph** with two levels:
- **Entities:** Key concepts (names, places, products, dates)
- **Relationships:** How entities connect

**Why This Solves Your Issue:**

```typescript
// Your current approach (BROKEN):
Document: "Test 1.xlsx contains water meter data..."
Embedding: [0.23, 0.45, ...] // Generic "document" embedding
Query: "avengers"
Match: 0.90 similarity ❌ (both have "document", "contains", "data")

// LightRAG approach (FIXED):
Document: "Test 1.xlsx contains water meter data..."
Entities Extracted:
  - "Test 1.xlsx" (document name)
  - "water meter" (device type)
  - "energy consumption" (metric)
  
Graph Connections:
  - Test 1.xlsx --contains--> water meter data
  - water meter --measures--> energy consumption

Query: "avengers"
Entities Extracted: "avengers" (movie/character)
Match: NO GRAPH CONNECTION → Returns nothing ✅

Query: "water meter readings"
Entities Extracted: "water meter" (device), "readings" (data)
Match: DIRECT GRAPH PATH → Returns Test 1.xlsx ✅
```

**Implementation for DocsFlow:**

```typescript
// After document upload, extract entities
import { LightRAG } from 'lightrag';

async function indexDocument(document: Document, tenantId: string) {
  // 1. Extract entities and relationships
  const graph = await LightRAG.extractKnowledgeGraph(document.content);
  
  // 2. Store in separate graph database (Neo4j or simple JSON)
  await storeKnowledgeGraph({
    tenant_id: tenantId,
    document_id: document.id,
    entities: graph.entities,  // ["water meter", "energy", "Test 1.xlsx"]
    relationships: graph.edges  // [("Test 1.xlsx", "contains", "water meter")]
  });
  
  // 3. ALSO store vector embeddings (hybrid approach)
  const embedding = await embed(document.content);
  await storeEmbedding({ tenant_id: tenantId, embedding });
}

async function search(query: string, tenantId: string) {
  // 1. Extract query entities
  const queryEntities = await LightRAG.extractEntities(query);
  
  // 2. Graph search (FAST, EXACT)
  const graphResults = await searchKnowledgeGraph({
    tenant_id: tenantId,
    entities: queryEntities,
    max_hops: 2  // Search 2 levels deep
  });
  
  // 3. Vector search (SEMANTIC)
  const vectorResults = await vectorSearch(query, tenantId);
  
  // 4. Combine with weighted fusion
  return fuseResults({
    graphResults: graphResults,  // Weight: 0.6 (exact matches)
    vectorResults: vectorResults  // Weight: 0.4 (semantic)
  });
}
```

**Result:**
- ✅ "Avengers" query finds NO entities in water meter docs → Score: 0
- ✅ "Water meter" query finds EXACT entity match → Score: 0.95
- ✅ Eliminates false positives from generic text

---

### 2. RAGFlow: Template-Based Deep Document Parsing (SOLVES EMBEDDING POLLUTION)

**What They Do Differently:**

RAGFlow doesn't just split documents by tokens. They use **document-type-aware parsing**:

```python
# RAGFlow's approach:
if file_type == 'xlsx':
    parser = ExcelParser()
    chunks = parser.extract_tables_and_headers()
    # Returns: [{"type": "table", "headers": [...], "data": [...]}]
    
elif file_type == 'pdf':
    parser = PDFParser()
    chunks = parser.extract_sections_by_headings()
    # Returns: [{"type": "section", "heading": "...", "content": "..."}]
    
elif file_type == 'image':
    parser = ImageParser()
    chunks = parser.ocr_and_structure()
    # Returns: [{"type": "text_block", "position": {...}, "content": "..."}]
```

**Why This Solves Your Issue:**

```typescript
// Your current approach (POLLUTED):
File: Test 1.xlsx
Current Processing:
  1. Convert to text: "Frame Type, Manufacturer, ID, Version..."
  2. Add LLM summary: "This spreadsheet contains data about energy..."
  3. Embed: [summary + content] → Generic embedding ❌

// RAGFlow approach (CLEAN):
File: Test 1.xlsx
RAGFlow Processing:
  1. Detect structure: Table with headers + data rows
  2. Extract metadata: 
     - Document type: "spreadsheet"
     - Columns: ["Frame Type", "Manufacturer", "ID", ...]
     - Data types: [string, string, integer, ...]
  3. Chunk by logical units:
     Chunk 1: Headers → "Frame Type, Manufacturer, ID"
     Chunk 2: First 10 rows → Raw data
     Chunk 3: Next 10 rows → Raw data
  4. Embed ONLY raw content (no summaries) → Specific embeddings ✅
  5. Store metadata separately:
     {
       "document_type": "spreadsheet",
       "columns": [...],
       "summary": "Energy consumption data" // NOT in embedding
     }
```

**Implementation for DocsFlow:**

```typescript
import { DocumentParser } from 'ragflow';

async function parseAndIndex(file: File, tenantId: string) {
  // 1. Detect document type
  const fileType = detectFileType(file);
  
  // 2. Use appropriate parser
  const parser = DocumentParser.forType(fileType);
  const parsedDoc = await parser.parse(file);
  
  // parsedDoc structure:
  // {
  //   type: 'spreadsheet',
  //   structure: { headers: [...], rows: [...] },
  //   chunks: [
  //     { content: "raw data", metadata: { row_range: "1-10" } },
  //     { content: "raw data", metadata: { row_range: "11-20" } }
  //   ]
  // }
  
  // 3. Embed ONLY raw content (no LLM summaries)
  for (const chunk of parsedDoc.chunks) {
    const embedding = await embed(chunk.content);  // Raw only!
    
    await storeChunk({
      tenant_id: tenantId,
      content: chunk.content,
      embedding: embedding,
      metadata: {
        ...chunk.metadata,
        document_type: parsedDoc.type,
        structure: parsedDoc.structure,
        summary: await generateSummary(chunk.content)  // Store separately
      }
    });
  }
}

// Query with document-type awareness
async function search(query: string, tenantId: string) {
  // Detect query intent
  const queryType = await classifyQuery(query);
  
  if (queryType === 'data_lookup') {
    // Prioritize spreadsheet/table documents
    return await vectorSearch(query, tenantId, {
      filter: { document_type: ['spreadsheet', 'database'] }
    });
  }
  
  if (queryType === 'image_search') {
    // Prioritize image documents
    return await vectorSearch(query, tenantId, {
      filter: { document_type: ['image', 'screenshot'] }
    });
  }
  
  // General search
  return await vectorSearch(query, tenantId);
}
```

**Result:**
- ✅ No more LLM summaries in embeddings
- ✅ Document structure preserved
- ✅ Cleaner, more specific embeddings

---

### 3. RAG_Techniques: Hypothetical Document Embeddings (HyDE) (IMPROVES QUERY MATCHING)

**What This Is:**

Instead of embedding the query directly, **generate a hypothetical answer** and embed that.

```typescript
// Traditional approach (WEAK):
Query: "is there an avengers file"
Embedding: embed("is there an avengers file")
// Embeds: "is", "there", "an", "file" → Generic

// HyDE approach (STRONG):
Query: "is there an avengers file"
Hypothetical Answer (generated by LLM):
  "An Avengers file would contain information about Marvel superheroes, 
   including Iron Man, Captain America, Thor, and other Avengers characters. 
   It might include movie scenes, character descriptions, or comic book content."

Embedding: embed(hypothetical_answer)
// Embeds: "Marvel", "superheroes", "Iron Man", "Captain America" → Specific!

// Now search
vectorSearch(embedding_of_hypothetical_answer)
// Matches documents containing "Marvel", "superheroes", "Avengers" → Correct! ✅
```

**Implementation:**

```typescript
async function hydeSearch(query: string, tenantId: string) {
  // 1. Generate hypothetical document
  const hypotheticalDoc = await llm.generate({
    prompt: `Given this query: "${query}"
    
    Write a short paragraph (2-3 sentences) describing what a document 
    answering this query would contain. Focus on specific keywords and concepts.
    
    Hypothetical document:`,
    temperature: 0.3
  });
  
  // 2. Embed the hypothetical document (not the query!)
  const embedding = await embed(hypotheticalDoc);
  
  // 3. Search with hypothetical embedding
  const results = await vectorSearch(embedding, tenantId);
  
  return results;
}

// Example outputs:
Query: "avengers"
Hypothetical: "A document about Avengers would contain Marvel superhero names, 
               movie titles like Endgame, and character descriptions."
Embedding matches: Avengers image ✅

Query: "water meter data"
Hypothetical: "A document about water meter data would contain device IDs, 
               consumption readings in m³, energy usage in Wh, and timestamps."
Embedding matches: Test 1.xlsx ✅
```

**Result:**
- ✅ Richer query representations
- ✅ Better semantic matching
- ✅ Fewer false positives

---

### 4. RagaAI-Catalyst: Automated Quality Monitoring (DETECTS YOUR ISSUES)

**What They Do:**

Instead of manually discovering retrieval issues, **continuously monitor** RAG quality:

```typescript
import { RagaAICatalyst } from 'raga-ai-catalyst';

// Set up monitoring
const monitor = new RagaAICatalyst({
  tenant_id: tenantId,
  metrics: [
    'context_precision',    // Are top results relevant?
    'context_recall',       // Did we retrieve all relevant docs?
    'answer_relevance',     // Is LLM answer on-topic?
    'faithfulness',         // Is answer grounded in context?
    'semantic_similarity'   // Query-result similarity
  ]
});

// Monitor every query
async function monitoredSearch(query: string, tenantId: string) {
  const startTime = Date.now();
  
  // Run search
  const results = await vectorSearch(query, tenantId);
  
  // Evaluate quality
  const evaluation = await monitor.evaluate({
    query: query,
    retrieved_contexts: results.map(r => r.content),
    answer: results[0]?.content || 'No results'
  });
  
  // Log to dashboard
  await monitor.log({
    query: query,
    tenant_id: tenantId,
    metrics: evaluation,
    latency_ms: Date.now() - startTime,
    results_count: results.length
  });
  
  // Alert if quality drops
  if (evaluation.context_precision < 0.5) {
    await sendAlert({
      tenant_id: tenantId,
      issue: 'Low context precision',
      query: query,
      score: evaluation.context_precision
    });
  }
  
  return results;
}

// Dashboard shows:
// - Queries with low precision (like your "avengers" query)
// - Trends over time
// - Per-tenant quality metrics
// - Common failure patterns
```

**Result:**
- ✅ Automatically detects retrieval quality issues
- ✅ Alerts when precision drops
- ✅ Identifies problematic query patterns
- ✅ Tracks improvements after fixes

---

### 5. RAG-Anything: Multimodal Semantic Routing (ROUTES TO RIGHT DOCUMENT TYPE)

**What They Do:**

Instead of searching all documents equally, **route queries to appropriate document types**:

```typescript
// RAG-Anything's approach:
async function smartRoute(query: string, tenantId: string) {
  // 1. Classify query intent
  const intent = await classifyQueryIntent(query);
  
  // intent returns:
  // {
  //   type: 'image_search' | 'data_lookup' | 'text_search' | 'code_search',
  //   confidence: 0.95,
  //   keywords: [...],
  //   expected_format: 'image' | 'spreadsheet' | 'pdf' | 'code'
  // }
  
  // 2. Route to specialized retrievers
  if (intent.type === 'image_search') {
    // Use CLIP embeddings for images
    return await imageRetriever.search(query, tenantId);
  }
  
  if (intent.type === 'data_lookup') {
    // Search only structured data (CSV, Excel, databases)
    return await dataRetriever.search(query, tenantId);
  }
  
  if (intent.type === 'text_search') {
    // Search documents (PDFs, Word, text files)
    return await textRetriever.search(query, tenantId);
  }
  
  // Fallback: search everything
  return await hybridRetriever.search(query, tenantId);
}

// Example routing:
Query: "avengers"
Intent: { type: 'image_search', confidence: 0.92 }
Action: Search ONLY images/screenshots → Finds avengers-endgame.jpg ✅

Query: "water meter readings"
Intent: { type: 'data_lookup', confidence: 0.88 }
Action: Search ONLY spreadsheets/databases → Finds Test 1.xlsx ✅

Query: "contract clause"
Intent: { type: 'text_search', confidence: 0.95 }
Action: Search ONLY PDFs/text docs → Finds contracts ✅
```

**Implementation:**

```typescript
interface DocumentTypeRetriever {
  search(query: string, tenantId: string): Promise<SearchResult[]>;
}

class ImageRetriever implements DocumentTypeRetriever {
  async search(query: string, tenantId: string) {
    // Use CLIP embeddings (better for images)
    const clipEmbedding = await embedWithCLIP(query);
    return await vectorSearch(clipEmbedding, tenantId, {
      filter: { mime_type: ['image/jpeg', 'image/png'] }
    });
  }
}

class DataRetriever implements DocumentTypeRetriever {
  async search(query: string, tenantId: string) {
    // Use structured query parsing
    const structuredQuery = await parseDataQuery(query);
    return await vectorSearch(query, tenantId, {
      filter: { 
        mime_type: ['text/csv', 'application/vnd.ms-excel'],
        has_table_structure: true
      }
    });
  }
}

// Main router
async function routedSearch(query: string, tenantId: string) {
  const intent = await classifyIntent(query);
  
  const retriever = {
    'image_search': new ImageRetriever(),
    'data_lookup': new DataRetriever(),
    'text_search': new TextRetriever(),
    'code_search': new CodeRetriever()
  }[intent.type] || new HybridRetriever();
  
  return await retriever.search(query, tenantId);
}
```

**Result:**
- ✅ Queries search only relevant document types
- ✅ Reduces false positives from wrong file types
- ✅ Faster search (smaller search space)

---

## 🎯 RECOMMENDED IMPLEMENTATION PRIORITY

### Phase 1 (THIS WEEK): Quick Wins - Fix Embedding Pollution

**Technique:** RAGFlow's Clean Parsing
**Effort:** 2-3 days
**Impact:** ⭐⭐⭐⭐⭐ (Fixes your core issue)

```typescript
// IMMEDIATE FIX:
// Stop adding LLM summaries to embeddings

// Current (BROKEN):
const enrichedContent = `${llmSummary}\n\n${rawContent}`;
const embedding = await embed(enrichedContent); // ❌

// Fixed (CLEAN):
const embedding = await embed(rawContent); // ✅ Raw only
await storeChunk({
  content: rawContent,
  embedding: embedding,
  metadata: {
    summary: llmSummary  // Store separately
  }
});
```

**Action Items:**
1. ✅ Update document processing to embed raw content only
2. ✅ Move summaries to metadata field
3. ✅ Re-embed all existing documents (run migration)

---

### Phase 2 (NEXT WEEK): Add Query Enhancement

**Technique:** HyDE (Hypothetical Document Embeddings)
**Effort:** 1-2 days
**Impact:** ⭐⭐⭐⭐ (Better query matching)

```typescript
// Add to search pipeline:
async function enhancedSearch(query: string, tenantId: string) {
  // Generate hypothetical document
  const hypothetical = await generateHypotheticalDoc(query);
  
  // Search with both original and hypothetical
  const [originalResults, hydeResults] = await Promise.all([
    vectorSearch(query, tenantId),
    vectorSearch(hypothetical, tenantId)
  ]);
  
  // Merge with weighted fusion
  return fuseResults({
    original: originalResults,  // Weight: 0.4
    hyde: hydeResults          // Weight: 0.6
  });
}
```

**Action Items:**
1. ✅ Implement HyDE query expansion
2. ✅ Test with problematic queries ("avengers", "water meter")
3. ✅ Tune weighting based on results

---

### Phase 3 (WEEK 3): Add Smart Routing

**Technique:** RAG-Anything's Query Intent Classification
**Effort:** 3-4 days
**Impact:** ⭐⭐⭐⭐ (Eliminates cross-type false positives)

```typescript
// Route queries to specialized retrievers
async function routedSearch(query: string, tenantId: string) {
  const intent = await classifyIntent(query);
  
  // Search only relevant document types
  const filter = {
    'image_search': { mime_type: ['image/*'] },
    'data_lookup': { mime_type: ['text/csv', 'application/*excel'] },
    'text_search': { mime_type: ['application/pdf', 'text/*'] }
  }[intent.type];
  
  return await vectorSearch(query, tenantId, { filter });
}
```

**Action Items:**
1. ✅ Build query intent classifier
2. ✅ Add document type filters to search
3. ✅ Test cross-type query performance

---

### Phase 4 (MONTH 2): Add Graph-Based Retrieval

**Technique:** LightRAG's Knowledge Graph
**Effort:** 1-2 weeks
**Impact:** ⭐⭐⭐⭐⭐ (Game-changer for exact matches)

```typescript
// Extract entities and build knowledge graph
async function indexWithGraph(document: Document, tenantId: string) {
  // 1. Extract entities
  const entities = await extractEntities(document.content);
  
  // 2. Build graph
  const graph = buildKnowledgeGraph(entities);
  
  // 3. Store in graph database
  await storeGraph({ tenant_id: tenantId, graph });
  
  // 4. Also store vector embeddings (hybrid)
  await storeEmbedding({ tenant_id: tenantId, embedding });
}

// Dual search: Graph + Vector
async function hybridGraphSearch(query: string, tenantId: string) {
  const [graphResults, vectorResults] = await Promise.all([
    graphSearch(query, tenantId),    // Exact entity matches
    vectorSearch(query, tenantId)    // Semantic matches
  ]);
  
  return fuseResults({
    graph: graphResults,   // Weight: 0.6 (exact)
    vector: vectorResults  // Weight: 0.4 (semantic)
  });
}
```

**Action Items:**
1. ✅ Research Neo4j or LightRAG integration
2. ✅ Build entity extraction pipeline
3. ✅ Implement graph storage layer
4. ✅ Add graph search to retrieval

---

### Phase 5 (ONGOING): Add Monitoring

**Technique:** RagaAI-Catalyst's Quality Monitoring
**Effort:** 2-3 days setup, ongoing monitoring
**Impact:** ⭐⭐⭐⭐ (Prevents regressions, identifies issues early)

```typescript
// Monitor every search
const monitor = new RagaAICatalyst({ tenant_id });

async function monitoredSearch(query: string, tenantId: string) {
  const results = await search(query, tenantId);
  
  // Evaluate quality
  const metrics = await monitor.evaluate({
    query,
    retrieved_contexts: results.map(r => r.content),
    answer: results[0]?.content
  });
  
  // Log to analytics
  await logMetrics({ tenant_id: tenantId, metrics });
  
  // Alert if quality drops
  if (metrics.context_precision < 0.5) {
    await sendAlert({ tenant_id, issue: 'Low precision', query });
  }
  
  return results;
}
```

**Action Items:**
1. ✅ Set up RagaAI-Catalyst or similar
2. ✅ Configure quality metrics
3. ✅ Build alerting dashboard
4. ✅ Monitor trends per tenant

---

## 📊 TECHNIQUE COMPARISON TABLE

| Technique | Repo | Solves Your Issue? | Effort | Impact | Priority |
|-----------|------|-------------------|--------|--------|----------|
| **Clean Parsing** | RAGFlow | ✅ YES (embedding pollution) | 2-3 days | ⭐⭐⭐⭐⭐ | 🔥 NOW |
| **HyDE** | RAG_Techniques | ✅ YES (better matching) | 1-2 days | ⭐⭐⭐⭐ | Week 2 |
| **Query Routing** | RAG-Anything | ✅ YES (cross-type errors) | 3-4 days | ⭐⭐⭐⭐ | Week 3 |
| **Graph Retrieval** | LightRAG | ✅ YES (exact matches) | 1-2 weeks | ⭐⭐⭐⭐⭐ | Month 2 |
| **Quality Monitoring** | RagaAI-Catalyst | ✅ YES (detects issues) | 2-3 days | ⭐⭐⭐⭐ | Ongoing |

---

## 🎯 YOUR ACTION PLAN (NEXT 7 DAYS)

### Day 1-2: Fix Embedding Pollution (RAGFlow Pattern)
```bash
1. Update document-chunks-enhanced.ts
   - Remove LLM summaries from embeddings
   - Move summaries to metadata
2. Test with one document
3. Compare embedding quality
```

### Day 3-4: Re-Embed Existing Documents
```bash
1. Write migration script
2. Re-process all documents (31 with embeddings)
3. Verify no summaries in embeddings
```

### Day 5: Implement HyDE (RAG_Techniques Pattern)
```bash
1. Add hypothetical document generation
2. Test with "avengers" query
3. Compare results: before vs after
```

### Day 6-7: Add Query Intent Routing (RAG-Anything Pattern)
```bash
1. Build simple query classifier
2. Add document type filters
3. Test cross-type queries
```

---

## THE BOTTOM LINE

### Open-Source RAG Techniques That Fix Your Issues:

| Your Problem | Solution from Repos | Implementation Time |
|--------------|-------------------|-------------------|
| **Embedding pollution** | RAGFlow's clean parsing | 2-3 days |
| **Poor query matching** | HyDE from RAG_Techniques | 1-2 days |
| **Cross-type false positives** | RAG-Anything's routing | 3-4 days |
| **Generic semantic similarity** | LightRAG's graph search | 1-2 weeks |
| **Unknown quality issues** | RagaAI monitoring | 2-3 days |

### Total Time to Fix All Issues: **2-3 weeks**

**Compare to:**
- Building from scratch: 3-6 months
- Ignoring open-source: Reinventing the wheel

---

## FINAL RECOMMENDATION

### ✅ YES - Steal These Techniques:

1. **RAGFlow's document parsing** → Fixes embedding pollution (your #1 issue)
2. **HyDE query expansion** → Improves matching quality
3. **RAG-Anything's routing** → Eliminates cross-type errors
4. **LightRAG's graph search** → Adds exact entity matching
5. **RagaAI monitoring** → Prevents future regressions

### ❌ NO - Don't Copy Their Architecture:

- They're single-tenant (you need multi-tenant)
- They're self-hosted (you're SaaS)
- They're developer tools (you need white-label)

**Use their RAG algorithms, build your own SaaS wrapper.**

---

Want me to start implementing the RAGFlow clean parsing technique first? That's your biggest win - will fix the "avengers" query issue immediately.

