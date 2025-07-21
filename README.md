# Next.js Multi-Tenant Example

A production-ready example of a multi-tenant application built with Next.js 15, featuring custom subdomains for each tenant and integrated AI-powered lead management.

## Features

- ✅ Custom subdomain routing with Next.js middleware  
- ✅ Tenant-specific content and pages  
- ✅ Shared components and layouts across tenants  
- ✅ Redis for tenant metadata storage  
- ✅ Admin interface for managing tenants  
- ✅ Emoji support for tenant branding  
- ✅ Support for local development with subdomains  
- ✅ Compatible with Vercel preview deployments  

## AI Lead Management Features

- Integrated tenant dashboard (`/app/[tenant]`) with lead overview and metrics  
- Leads table with full CRUD capabilities and AI analysis integration  
- Lead detail pages showing AI score, confidence, reasoning, and recommendations  
- Analytics dashboard with conversion rates, AI score distributions, and trend charts  
- Tenant settings for AI preferences, notification settings, branding, and data retention  
- AI-powered lead analysis and scoring system using OpenAI  
- Multi-tenant data isolation and security via Supabase RLS and Redis metadata  
- Key capabilities: lead tracking, AI analysis, analytics, tenant settings, and bulk operations  

## Tech Stack

- [Next.js 15](https://nextjs.org/) with App Router  
- [React 19](https://react.dev/)  
- [Upstash Redis](https://upstash.com/) for tenant metadata storage  
- [Supabase](https://supabase.com/) for lead data storage and Row Level Security (RLS)  
- [OpenAI](https://openai.com/) API for AI lead analysis  
- [Recharts](https://recharts.org) for analytics charts  
- [Tailwind 4](https://tailwindcss.com/) for styling  
- [shadcn/ui](https://ui.shadcn.com/) for the design system  

## Getting Started

### Prerequisites

- Node.js 18.17.0 or later  
- pnpm (recommended) or npm/yarn  
- Upstash Redis account (for production)  
- Supabase project (for lead management)  
- OpenAI API key (for AI analysis)  

### Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/vercel/platforms.git
   cd platforms
   ```

2. Install dependencies:

   ```bash
   pnpm install
   ```

3. Set up environment variables:

   Create a `.env.local` file in the root directory with the following values:

   ```
   # Redis (tenant metadata)
   KV_REST_API_URL=your_upstash_redis_url
   KV_REST_API_TOKEN=your_upstash_redis_token

   # Multi-tenant routing
   NEXT_PUBLIC_ROOT_DOMAIN=localhost:3000

   # Supabase (lead data)
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

   # OpenAI (AI analysis)
   OPENAI_API_KEY=your_openai_api_key
   OPENAI_MODEL=gpt-4
   AI_ANALYSIS_ENABLED=true

   # Optional services
   RESEND_API_KEY=your_resend_api_key
   WEBHOOK_SECRET=your_webhook_secret
   LOG_LEVEL=info
   ```

4. Supabase Setup:

   - In your Supabase project, create the `leads` table with the required columns (id, tenant_id, name, email, phone, source, status, priority, ai_score, ai_confidence, ai_reasoning, ai_model_version, ai_analysis_timestamp, ai_recommendation, created_at, updated_at, assigned_to, notes).
   - Enable Row Level Security (RLS) and create policies to restrict access to leads per tenant:

     ```sql
     -- Enable RLS
     ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

     -- Allow tenants to SELECT their own leads
     CREATE POLICY "Tenant can access own leads"
       ON leads FOR SELECT
       USING (tenant_id = auth.uid());

     -- Allow tenants to INSERT, UPDATE, DELETE their own leads
     CREATE POLICY "Tenant can modify own leads"
       ON leads FOR INSERT, UPDATE, DELETE
       WITH CHECK (tenant_id = auth.uid());
     ```

5. OpenAI Setup:

   - Ensure `OPENAI_API_KEY` and `OPENAI_MODEL` are set in your `.env.local`.
   - Optionally adjust `AI_ANALYSIS_ENABLED` to `false` to disable AI features.

6. Start the development server:

   ```bash
   pnpm dev
   ```

7. Access the application:

   - Main site: http://localhost:3000  
   - Admin panel: http://localhost:3000/admin  
   - Tenant dashboard: http://[tenant-name].localhost:3000  

## Multi-Tenant Architecture

This application demonstrates a subdomain-based multi-tenant architecture:

- Each tenant is scoped to a subdomain (`tenant.yourdomain.com`)  
- Middleware rewrites requests to `/app/[tenant]` routes for isolation  
- Tenant metadata (displayName, contactEmail, settings, subscriptionTier, leadCount, lastActivity, aiEnabled) is stored in Redis  
- Lead data is stored in Supabase with RLS enforcing tenant isolation  
- AI analysis uses OpenAI, scoped per tenant based on settings and subscription level  

### Routing Structure

- `/` → Public landing page or admin panel  
- `/app/[tenant]` → Tenant dashboard  
- `/app/[tenant]/leads` → Leads list  
- `/app/[tenant]/leads/[id]` → Lead detail  
- `/app/[tenant]/analytics` → Analytics dashboard  
- `/app/[tenant]/settings` → Tenant settings  

### Data Layer

- Redis for high-speed tenant metadata and caching  
- Supabase for transactional lead storage, with RLS for security  
- OpenAI for AI-driven lead analysis, with retry logic and rate limiting  

## Development Workflow

- Branch per feature with meaningful names (e.g., `feature/ai-lead-analysis`)  
- Use tenant-aware URLs (e.g., `http://demo.localhost:3000/app/demo`) for testing  
- Write tests for multi-tenant routes, RLS policies, and AI integration  
- Use `pnpm test` to run unit and integration tests  
- Common troubleshooting:
  - Ensure `.env.local` variables are loaded (`pnpm dev` restart)  
  - Verify Supabase RLS policies in the dashboard  
  - Check OpenAI API usage and rate limits  
  - Inspect Redis connectivity with Upstash dashboard  

## Deployment

### Vercel Deployment

1. Push your repository to GitHub.  
2. Connect your repository to Vercel.  
3. In Vercel dashboard, add the following Environment Variables:

   ```
   KV_REST_API_URL
   KV_REST_API_TOKEN
   NEXT_PUBLIC_ROOT_DOMAIN
   NEXT_PUBLIC_SUPABASE_URL
   NEXT_PUBLIC_SUPABASE_ANON_KEY
   SUPABASE_SERVICE_ROLE_KEY
   OPENAI_API_KEY
   OPENAI_MODEL
   AI_ANALYSIS_ENABLED
   RESEND_API_KEY (optional)
   WEBHOOK_SECRET (optional)
   LOG_LEVEL (optional)
   ```

4. Deploy.

### Custom Domains & DNS

- Add your root domain to Vercel.  
- Configure a wildcard DNS record (`*.yourdomain.com`) pointing to Vercel.

### Production Considerations

- Monitor OpenAI usage and costs; set usage caps if needed.  
- Rotate `SUPABASE_SERVICE_ROLE_KEY` periodically for security.  
- Use a secrets management service or Vercel's encrypted vars for production keys.  
- Scale Redis and Supabase based on tenant load and data volume.  
- Implement analytics and logging using `LOG_LEVEL` and external monitoring.

---

Maintain platform foundation and multi-tenant routing while leveraging AI for intelligent lead management and analytics. Happy building!