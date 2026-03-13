# DocsFlow — Portfolio Project Brief

> **Purpose**: Comprehensive context document for writing portfolio content about DocsFlow.
> Everything below is verified against the actual codebase as of March 2026.

---

## 1. What DocsFlow Is

DocsFlow is a **multi-tenant document intelligence SaaS platform** built with Next.js 15 and TypeScript. Users upload documents (PDF, DOCX, XLSX, PPTX, images, text) and query them in natural language. Every AI response is source-attributed — users can verify any claim against the original document.

- **Live URL**: https://docsflow.app
- **GitHub**: https://github.com/nicuk/docsflow
- **License**: MIT
- **Codebase**: ~352 TypeScript files, 1,188 commits

---

## 2. Architecture (Accurate)

### Full Stack
| Layer | Technology | Notes |
|-------|-----------|-------|
| Framework | Next.js 15 (App Router) | Server Components, Turbopack |
| Language | TypeScript (strict mode off) | ~352 files |
| Auth | Clerk | Session tokens, enterprise SSO, webhook sync |
| Database | Supabase (PostgreSQL) | Row-Level Security on all tables |
| Vector Store | Pinecone | Namespace-per-tenant isolation |
| Embeddings | OpenAI text-embedding-3-small | 1536 dimensions, batch API |
| LLM Providers | OpenRouter (Llama 3.3 70B primary, GPT-4o-mini, Mixtral fallback) + Google Gemini 2.0 Flash | 3-tier failover with circuit breaker |
| Payments | Stripe | Subscription tiers + usage metering |
| File Storage | Vercel Blob | CDN-backed, public URLs |
| Queue | Supabase-backed job queue | Vercel Cron triggers worker every minute |
| UI | Tailwind CSS, Radix UI (shadcn/ui), Framer Motion | |
| Deployment | Vercel | Serverless functions, edge middleware |

### RAG Pipeline (What Actually Runs)

```
User Query
    │
    ├─ Gibberish Detection (regex-based)
    ├─ Metadata Query Detection (document count/list shortcuts)
    ├─ Conversation Memory (loads last 6 messages, reformulates vague follow-ups)
    │
    ▼
Query Workflow
    │
    ├─ Generate query embedding (OpenAI)
    ├─ Generate sparse vector (BM25 keyword matching)
    │
    ├─ IF < 20 documents: Direct Pinecone hybrid search (fast path)
    ├─ IF 20+ documents: Hierarchical 2-stage retrieval
    │       Stage 1: Rank documents by summary similarity (batch embedding)
    │       Stage 2: Search Pinecone within top-ranked documents
    │
    ├─ Confidence scoring (threshold-based abstention)
    ├─ Source deduplication
    │
    ▼
LLM Generation
    │
    ├─ Query complexity classification (simple/medium/complex)
    ├─ Model selection based on complexity tier
    ├─ OpenRouter with 3-tier failover → Gemini emergency fallback
    ├─ Citation enhancement (maps claims to source documents)
    │
    ▼
Response with sources, confidence score, citations
```

### Document Ingestion Pipeline

```
File Upload → Vercel Blob Storage
    │
    ├─ Create document record (Supabase, status: pending)
    ├─ Create ingestion job (Supabase job queue)
    │
    ▼ (Vercel Cron triggers worker every minute)
    │
Worker picks up job
    │
    ├─ Parse file:
    │     PDF → @langchain/community PDFLoader
    │     DOCX → mammoth (buffer-based, no disk I/O)
    │     Image → Gemini 2.0 Flash Vision OCR via OpenRouter
    │     Text → UTF-8 decode
    │
    ├─ Chunk with RecursiveCharacterTextSplitter (1000 chars, 200 overlap)
    ├─ Store chunks in document_chunks table (Supabase)
    │
    ├─ IN PARALLEL:
    │     ├─ Generate document summary (GPT-4o-mini via OpenRouter)
    │     └─ Generate embeddings (OpenAI batch API)
    │
    ├─ Generate sparse vectors (BM25, local computation)
    ├─ Upsert to Pinecone (batched, with retry + timeout)
    │
    ▼
Mark job completed, update document status
```

### Multi-Tenant Isolation

This is a genuine architectural strength:
- **Database**: Supabase Row-Level Security on every table. Queries physically cannot return another tenant's data.
- **Vectors**: Each tenant gets a separate Pinecone namespace. Cross-tenant vector leakage is impossible.
- **Auth**: Clerk session tokens carry tenant context. Middleware validates on every request.
- **Subdomains**: `{tenant}.docsflow.app` routing with tenant resolution in edge middleware.
- **File Storage**: Files stored under tenant-prefixed paths in Vercel Blob.

---

## 3. What Works Well (Strengths to Highlight)

### Architecture
- **Clean RAG pipeline separation**: `lib/rag/core/` has independent modules for embeddings, retrieval, generation, summarization, sparse vectors. Each is independently testable.
- **Hybrid search**: Combines dense (semantic) + sparse (keyword/BM25) vectors with Reciprocal Rank Fusion. This is an advanced retrieval technique that meaningfully improves results.
- **Hierarchical retrieval**: For large document collections (20+), uses a 2-stage approach: document-level ranking → chunk-level search. Scales efficiently.
- **Multi-provider LLM failover**: 3-tier cascade (Llama 3.3 → GPT-4o-mini → Mixtral) with circuit breaker pattern and emergency Gemini fallback. Production-grade resilience.
- **Conversation memory**: Server-side history loading, vague query reformulation using lightweight LLM, multi-turn coherence.

### Production Features
- **Stripe integration**: Full subscription billing with tier enforcement, usage tracking, webhook handlers for payment events.
- **Admin dashboard**: User management, system health monitoring, pending user approvals.
- **AI persona customization**: Per-tenant AI personality (role, tone, business context, focus areas). Stored in database, loaded per query.
- **Query complexity routing**: Classifies queries as simple/medium/complex and routes to appropriate model tier. Cost optimization.
- **SAML SSO support**: Enterprise authentication via SAML with per-tenant configuration.
- **Image OCR**: Uploaded images are processed through Gemini Vision for text extraction.

### Code Quality
- 1,188 commits showing authentic development history
- Clean project structure (`app/`, `lib/`, `components/`, `hooks/`, `types/`)
- MIT licensed with proper README, architecture diagram, and getting-started docs
- No exposed secrets or credentials in the repository

---

## 4. Known Limitations (Be Honest About These)

### Code Quality Issues
- **TypeScript strict mode is OFF** (`strict: false`, `noImplicitAny: false`). The codebase has ~20+ `as any` casts to work around type mismatches. This was a pragmatic decision to ship, not best practice.
- **Double LLM call on successful queries**: The RAG pipeline's `generation.ts` generates an answer that gets discarded — the chat route generates its own answer with the tenant persona. This wastes ~3-5s of latency and API cost per query.
- **Minimal test coverage**: Test infrastructure exists (Playwright, Jest) but actual test coverage is thin.
- **Some dead code patterns**: A few unused imports and empty catch blocks remain.

### Architecture Limitations
- **1-minute cron latency**: Document processing is triggered by Vercel Cron (once per minute). Users wait up to 60 seconds after upload before processing starts. A webhook or edge function trigger would be faster.
- **No streaming responses**: Chat responses are generated fully before being sent. Streaming would improve perceived latency.
- **Vercel serverless constraints**: Worker functions have time limits. Very large documents may timeout during processing.

### What Was Recently Fixed (March 2026)
These were production bugs found and fixed during code review:
- Document chunks were never persisted to Supabase (only to Pinecone) — broke document content preview
- Pinecone metadata key mismatch (camelCase vs snake_case) — broke hierarchical retrieval
- LangSmith tracing wrapper was timing out on every call — added ~5s latency to every operation
- Summary + embedding generation was sequential — now parallelized

---

## 5. Metrics (Verified)

| Metric | Value | Context |
|--------|-------|---------|
| Codebase size | ~352 TypeScript files | Full-stack application |
| Commit history | 1,188 commits | Authentic development history |
| LLM providers | 4 (Llama 3.3, GPT-4o-mini, Mixtral, Gemini) | With automatic failover |
| Document types | 6 (PDF, DOCX, XLSX, PPTX, images, text) | Via LangChain + mammoth + Gemini Vision |
| Multi-tenant isolation | 4 layers (DB RLS, Pinecone namespace, auth, subdomain) | Enterprise-grade |
| Search type | Hybrid (dense + sparse + hierarchical) | Advanced RAG architecture |

### Metrics to NOT Claim (Without Evidence)
- Do NOT claim specific accuracy percentages (e.g., "96.8% accuracy") unless you have evaluation data to back it up
- Do NOT claim specific user counts unless verified
- Do NOT claim revenue numbers unless verified
- Do NOT claim processing speed improvements without before/after benchmarks

---

## 6. Honest Portfolio Rating: 6.5/10

### Breakdown
| Category | Score | Notes |
|----------|-------|-------|
| Architecture design | 8/10 | RAG pipeline, multi-tenant isolation, LLM failover are genuinely well-designed |
| Feature completeness | 7/10 | Upload, chat, admin, billing, persona, conversation memory all work |
| Code quality | 5/10 | `strict: false`, `as any` casts, double LLM call, thin tests |
| Production readiness | 6/10 | Core pipeline works end-to-end but edge cases untested |
| Portfolio impression | 7/10 | Good README, clean structure, live demo, real architecture |

### What Would Make It 8-9/10
1. Enable TypeScript strict mode and fix the ~750 type errors properly
2. Eliminate the double LLM call (skip `generation.ts` for successful queries)
3. Add streaming responses for chat
4. Add meaningful test coverage (at least for the RAG pipeline)
5. Replace Vercel Cron with immediate processing trigger
6. Add RAG evaluation framework with measurable accuracy metrics

---

## 7. How to Position This in a Portfolio

### Good Framing
- "Multi-tenant document intelligence platform with production RAG pipeline"
- "Hybrid search (semantic + keyword) with hierarchical retrieval and 4-layer tenant isolation"
- "3-tier LLM failover with circuit breaker pattern and query complexity routing"
- "Server-side conversation memory with vague query reformulation"
- "Full SaaS stack: auth, billing, admin, document processing, AI chat"

### Avoid Claiming
- Specific accuracy percentages without evaluation data
- "Enterprise-grade" code quality (strict mode is off)
- Large user base (unless you have real usage metrics)
- That this was built entirely solo if it wasn't

### Compared to Your Other Projects
Looking at your GitHub profile, this is your most architecturally complex project. The RAG pipeline with hybrid search + hierarchical retrieval + conversation memory is more sophisticated than a typical CRUD app. The multi-tenant isolation is a real differentiator.

For your "Lead AI Architect" positioning, this project demonstrates:
- Real RAG architecture (not just calling an API)
- Production concerns (failover, circuit breaker, cost monitoring)
- Multi-tenant SaaS patterns (RLS, namespace isolation, subdomain routing)
- Full-stack ownership (frontend, backend, database, AI pipeline, billing)

---

## 8. Repository Details

- **Repo URL**: https://github.com/nicuk/docsflow
- **Live Demo**: https://docsflow.app
- **Primary Branch**: main
- **Framework**: Next.js 15 (App Router)
- **Package Manager**: npm
- **License**: MIT
- **Deploy Platform**: Vercel
