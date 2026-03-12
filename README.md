<div align="center">

# DocsFlow

**Multi-Tenant Document Intelligence Platform with Production RAG Pipeline**

[Live Demo](https://docsflow.app) &middot; [Architecture Docs](docs/technical/RAG_SYSTEM_ARCHITECTURE.md) &middot; [Contact](mailto:nic.chin@bitto.tech)

</div>

---

## What is DocsFlow?

DocsFlow is a production-grade SaaS platform that lets teams upload documents and query them using natural language. Every answer is source-attributed — users click any claim to see the exact document and page it came from.

**Core capabilities:**
- Upload PDFs, Word, Excel, and PowerPoint files into tenant-isolated workspaces
- Ask questions in plain English and get answers grounded in your documents
- Click any response to see the original source with highlighted passages
- Separate workspaces per team with row-level security — zero data leakage between tenants

---

## Architecture

```
                    ┌─────────────────────────────────────────────┐
                    │              Next.js 15 (App Router)        │
                    │         Clerk Auth + Middleware              │
                    └──────────────┬──────────────────────────────┘
                                   │
                    ┌──────────────▼──────────────────────────────┐
                    │            API Layer                         │
                    │  /api/chat  /api/documents  /api/queue      │
                    └──┬───────────┬──────────────┬───────────────┘
                       │           │              │
              ┌────────▼──┐  ┌────▼─────┐  ┌─────▼──────┐
              │  RAG       │  │ Supabase │  │  Queue     │
              │  Pipeline  │  │ Postgres │  │  Worker    │
              │            │  │  + RLS   │  │            │
              └──┬────┬────┘  └──────────┘  └────────────┘
                 │    │
        ┌────────▼┐  ┌▼──────────┐
        │ Pinecone│  │ LLM Layer │
        │ Vectors │  │ Gemini →  │
        │         │  │ Llama →   │
        │         │  │ Mixtral   │
        └─────────┘  └───────────┘
```

### RAG Pipeline

The retrieval pipeline processes queries through multiple stages:

1. **Query Classification** — Intent detection and complexity routing
2. **Hybrid Search** — Vector similarity + keyword matching with Reciprocal Rank Fusion
3. **Hierarchical Retrieval** — Parent-child chunk relationships for context preservation
4. **Source Deduplication** — Eliminates redundant passages across document versions
5. **Confidence Scoring** — Each response includes a grounded confidence metric
6. **Source Attribution** — Every claim maps back to a specific document section

### Multi-Tenant Isolation

Each tenant operates in complete isolation:
- **Database**: Row-Level Security policies on all tables — queries physically cannot return another tenant's data
- **Vectors**: Pinecone namespace separation per tenant
- **Auth**: Clerk session tokens carry tenant context through the middleware layer
- **Subdomains**: `{tenant}.docsflow.app` routing with tenant resolution in middleware

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | Next.js 15 (App Router, Turbopack) |
| **Language** | TypeScript |
| **Auth** | Clerk |
| **Database** | Supabase (PostgreSQL + pgvector + RLS) |
| **Vector Store** | Pinecone |
| **LLM** | Gemini 2.0 Flash (primary), Llama 3, Mixtral (failover) |
| **Embeddings** | OpenAI text-embedding-3-small |
| **Payments** | Stripe (subscription tiers + usage tracking) |
| **File Storage** | Vercel Blob |
| **Queue** | Supabase-backed job queue with cron worker |
| **UI** | Tailwind CSS, Radix UI, Framer Motion |
| **Testing** | Playwright (E2E), Jest (unit) |
| **Deployment** | Vercel |

---

## Project Structure

```
docsflow/
├── app/                    # Next.js App Router
│   ├── api/                # API routes (chat, documents, queue, auth, admin, stripe)
│   ├── dashboard/          # Protected dashboard pages
│   └── ...                 # Auth pages, onboarding, landing
├── components/             # React components
│   ├── ui/                 # Reusable UI primitives (shadcn/ui)
│   ├── admin/              # Admin dashboard components
│   ├── documents/          # Upload zone, document viewers
│   ├── queue/              # Job queue dashboard
│   └── ...                 # Chat, persona, analytics components
├── lib/                    # Core business logic
│   ├── rag/                # RAG pipeline
│   │   ├── core/           # Embeddings, retrieval, generation, summarization
│   │   ├── storage/        # Pinecone adapter
│   │   └── workflows/      # Query, ingest, delete workflows
│   ├── auth/               # Auth provider factory (Clerk/Supabase)
│   ├── subscription/       # Tier enforcement and billing logic
│   └── queue/              # Job queue types and utilities
├── hooks/                  # React hooks (auth, toast, performance)
├── types/                  # TypeScript type definitions
├── tests/                  # E2E and integration tests
├── scripts/                # Database migrations and evaluation tools
├── migrations/             # SQL migration files
└── docs/                   # Technical architecture documentation
```

---

## Getting Started

```bash
# Clone and install
git clone https://github.com/nicholasgchin/docsflow.git
cd docsflow
npm install

# Set up environment
cp .env.example .env.local
# Fill in your API keys (see .env.example for all required vars)

# Run database migrations
node scripts/run-migrations.js

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Key Engineering Decisions

| Decision | Rationale |
|----------|-----------|
| **Pinecone over pgvector for search** | Tenant namespace isolation + managed scaling; pgvector used for metadata queries |
| **Multi-provider LLM with failover** | Gemini for speed/cost, automatic fallback to Llama/Mixtral on provider outage |
| **Supabase job queue over Redis** | Single data layer, RLS applies to jobs, no additional infra for early-stage SaaS |
| **Clerk over custom auth** | Enterprise SSO support, session management, webhook-driven user sync |
| **Hierarchical chunking** | Parent-child chunk relationships preserve document context during retrieval |

---

## License

This is a showcase repository demonstrating production RAG architecture and full-stack engineering. Source code is available for review purposes.

---

<div align="center">

Built by [Nic Chin](https://nicchin.com) &middot; [LinkedIn](https://linkedin.com/in/nicchin) &middot; [nic.chin@bitto.tech](mailto:nic.chin@bitto.tech)

</div>
