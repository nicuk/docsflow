# White-Label Implementation: Critical Gap Analysis
## Date: October 2, 2025

---

## The Question

> "But how do agencies white-label our RAG for their clients? They will still see DocsFlow?"

**This is THE critical question that determines if the agency strategy works at all.**

---

## Current State Assessment

### What DocsFlow Has Today:

✅ **Subdomain Support:**
- Each tenant gets: `tenant.docsflow.app`
- Tenants table has `subdomain` field
- Routing works per subdomain
- Data isolation via tenant_id

❌ **What's Missing for True White-Label:**
1. **Custom domains** (`portal.agency.com` instead of `tenant.docsflow.app`)
2. **Logo customization** (tenants table has NO `logo_url` field)
3. **Color/theme customization** (tenants table has NO `theme` field)
4. **Branding removal** ("Powered by DocsFlow" footer, etc.)
5. **Custom email notifications** (still from DocsFlow domain)
6. **Embeddable widget** (iframe for agencies to embed in their sites)

---

## The Problem: Agencies Will See "DocsFlow" Everywhere

### What Agency Clients Will Currently See:

```
❌ URL: client-name.docsflow.app  
   (Should be: portal.agencyname.com or docs.agencyname.com)

❌ Interface:
   - DocsFlow logo in top left
   - "DocsFlow" in page title
   - "Powered by DocsFlow" in footer
   
❌ Emails:
   - From: notifications@docsflow.app
   - Subject: "DocsFlow Alert: ..."
   - Footer: "This email sent from DocsFlow"

❌ Branding:
   - DocsFlow colors (purple/blue?)
   - DocsFlow fonts
   - DocsFlow UI style
```

**Result:** Agency clients know they're using a third-party tool, not the agency's own platform.

**Problem:** Agencies can't charge premium prices for something that's obviously rebranded.

---

## What "True White-Label" Requires

### Level 1: Basic White-Label (Minimum Viable)
**Investment: 1-2 weeks development**

| Feature | Current | Required | Effort |
|---------|---------|----------|--------|
| **Custom Domain** | `tenant.docsflow.app` | `portal.agency.com` | 3 days |
| **Logo Upload** | No field in DB | Upload + display tenant logo | 1 day |
| **Remove Branding** | "DocsFlow" everywhere | Configurable product name | 2 days |
| **Color Scheme** | Fixed | Primary/secondary color picker | 2 days |
| **Email Domain** | `@docsflow.app` | `@agency.com` (SendGrid/AWS SES) | 3 days |

**Total: ~2 weeks**

---

### Level 2: Full White-Label (Agency-Ready)
**Investment: 1-2 months development**

| Feature | Description | Effort |
|---------|-------------|--------|
| **Custom DNS** | Agencies point `docs.agency.com` to your servers | 1 week |
| **SSL Certificates** | Auto-provision SSL for custom domains (Let's Encrypt) | 1 week |
| **Embeddable Widget** | `<iframe>` or React component agencies can embed | 2 weeks |
| **White-Label API** | API endpoints return agency branding, not DocsFlow | 3 days |
| **Custom Email Templates** | Agencies customize email designs + sender | 1 week |
| **Subdomain Vanity URLs** | `client1.agency.com`, `client2.agency.com` | 1 week |
| **Admin Dashboard** | Agency manages multiple client tenants | 1 week |
| **Reporting/Analytics** | Agency sees all client usage in one view | 1 week |

**Total: ~6-8 weeks**

---

### Level 3: Enterprise White-Label (Rare, High-Touch)
**Investment: 3-6 months**

- On-premise deployment (Docker/Kubernetes)
- Complete source code access
- Custom integrations
- SLA guarantees
- Dedicated support

**Most agencies don't need this.**

---

## Implementation Roadmap

### Phase 1: MVP White-Label (Weeks 1-2)

**Goal:** Agencies can say "This is our platform" with straight face

**Week 1:**
```sql
-- 1. Extend tenants table
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS logo_url TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS custom_domain TEXT UNIQUE;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS brand_name TEXT DEFAULT 'DocsFlow';
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS theme JSONB DEFAULT '{
  "primary_color": "#4F46E5",
  "secondary_color": "#10B981",
  "font_family": "Inter"
}'::jsonb;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS email_from_name TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS email_from_address TEXT;
```

```typescript
// 2. Logo Upload API
POST /api/tenant/branding/logo
- Accept image upload
- Resize to 200x60px
- Store in Supabase Storage
- Update tenants.logo_url

// 3. Theme Customization API
POST /api/tenant/branding/theme
{
  "primary_color": "#FF6B6B",
  "secondary_color": "#4ECDC4",
  "font_family": "Roboto"
}
```

```tsx
// 4. Dynamic Branding in UI
// components/branding-provider.tsx
export function BrandingProvider({ children }) {
  const { tenant } = useTenant();
  
  return (
    <div style={{
      '--brand-primary': tenant.theme.primary_color,
      '--brand-secondary': tenant.theme.secondary_color,
      fontFamily: tenant.theme.font_family
    }}>
      <Head>
        <title>{tenant.brand_name || 'DocsFlow'}</title>
        <link rel="icon" href={tenant.logo_url || '/favicon.ico'} />
      </Head>
      {children}
    </div>
  );
}
```

**Week 2:**
```typescript
// 5. Remove "Powered by DocsFlow" conditionally
{tenant.white_label_enabled && <Footer brandName={tenant.brand_name} />}

// 6. Custom Email Templates
async function sendEmail(tenant, recipient, template) {
  const from = tenant.email_from_address || 'notifications@docsflow.app';
  const fromName = tenant.email_from_name || 'DocsFlow';
  const subject = template.subject.replace('DocsFlow', tenant.brand_name);
  
  await sendgrid.send({
    from: { email: from, name: fromName },
    to: recipient,
    subject,
    html: renderTemplate(template, { brandName: tenant.brand_name })
  });
}
```

**Deliverable:** Agencies can upload logo, change colors, hide "DocsFlow" branding

---

### Phase 2: Custom Domains (Weeks 3-4)

**Goal:** `docs.agencyname.com` instead of `tenant.docsflow.app`

**Technical Implementation:**

```typescript
// 1. DNS Configuration
// Agency adds DNS records:
// CNAME: docs.agencyname.com → proxy.docsflow.app
// TXT: _docsflow_verify=abc123 (for verification)

// 2. Domain Verification API
POST /api/tenant/domain/verify
{
  "custom_domain": "docs.agencyname.com"
}

// Response:
{
  "verification_token": "abc123",
  "dns_records": [
    { "type": "CNAME", "name": "docs", "value": "proxy.docsflow.app" },
    { "type": "TXT", "name": "_docsflow_verify", "value": "abc123" }
  ],
  "status": "pending"
}

// 3. SSL Certificate Provisioning (Let's Encrypt)
// When DNS verified:
await acme.issue({
  domain: 'docs.agencyname.com',
  challenge: 'http-01'
});

// 4. Routing
// middleware.ts
export function middleware(request: NextRequest) {
  const hostname = request.headers.get('host');
  
  // Check if custom domain
  const tenant = await getTenantByCustomDomain(hostname);
  if (tenant) {
    request.headers.set('x-tenant-id', tenant.id);
  }
  
  // Fallback to subdomain
  else if (hostname.includes('.docsflow.app')) {
    const subdomain = hostname.split('.')[0];
    const tenant = await getTenantBySubdomain(subdomain);
    request.headers.set('x-tenant-id', tenant.id);
  }
}
```

**Deliverable:** Agencies can use own domain, SSL auto-provisioned

---

### Phase 3: Embeddable Widget (Weeks 5-6)

**Goal:** Agencies embed DocsFlow chat in their own sites

**Implementation:**

```typescript
// 1. Widget Script
// public/widget.js
(function() {
  window.DocsFlowWidget = {
    init: function(config) {
      const iframe = document.createElement('iframe');
      iframe.src = `https://${config.domain}/embed/chat?tenant=${config.tenantId}&theme=${config.theme}`;
      iframe.style = 'width: 400px; height: 600px; border: none;';
      document.getElementById(config.container).appendChild(iframe);
    }
  };
})();

// 2. Usage by Agency
<script src="https://cdn.docsflow.app/widget.js"></script>
<div id="docsflow-container"></div>
<script>
  DocsFlowWidget.init({
    domain: 'docs.agencyname.com', // Or tenant.docsflow.app
    tenantId: 'abc-123',
    theme: 'light',
    container: 'docsflow-container'
  });
</script>

// 3. Embed Route
// app/embed/chat/page.tsx
export default function EmbedChat({ searchParams }) {
  const { tenant, theme } = searchParams;
  
  return (
    <div className="embed-container" data-theme={theme}>
      {/* No headers, no branding, just chat interface */}
      <ChatInterface tenantId={tenant} />
    </div>
  );
}
```

**Deliverable:** Agencies embed chat widget in their own sites

---

### Phase 4: Agency Admin Dashboard (Weeks 7-8)

**Goal:** Agencies manage multiple client tenants from one view

**Features:**

```typescript
// 1. Agency account type
ALTER TABLE tenants ADD COLUMN account_type TEXT DEFAULT 'direct';
-- 'direct' = individual customer
-- 'agency' = agency partner
-- 'reseller' = reseller partner

ALTER TABLE tenants ADD COLUMN parent_agency_id UUID REFERENCES tenants(id);
-- Child tenants link to parent agency

// 2. Agency Dashboard
// app/agency/dashboard/page.tsx
export default function AgencyDashboard() {
  const agency = useAgency();
  const clients = useClientTenants(agency.id);
  
  return (
    <div>
      <h1>{agency.brand_name} - Client Management</h1>
      
      {/* Overview */}
      <Stats>
        <Stat label="Active Clients" value={clients.length} />
        <Stat label="Total Queries" value={sumQueries(clients)} />
        <Stat label="MRR" value={calculateMRR(clients)} />
      </Stats>
      
      {/* Client List */}
      <ClientTable clients={clients}>
        {clients.map(client => (
          <Row>
            <td>{client.name}</td>
            <td>{client.queries_this_month}</td>
            <td>{client.last_active}</td>
            <td>
              <Button onClick={() => loginAsClient(client.id)}>
                Manage
              </Button>
            </td>
          </Row>
        ))}
      </ClientTable>
      
      {/* Add New Client */}
      <Button onClick={() => createClientTenant()}>
        + Add New Client
      </Button>
    </div>
  );
}

// 3. Client Provisioning
POST /api/agency/clients
{
  "client_name": "Acme Corp",
  "client_industry": "legal",
  "client_subdomain": "acme-legal"
}

// Creates:
// - New tenant with parent_agency_id = agency.id
// - Subdomain: acme-legal.agencyname.com (or acme-legal.docsflow.app)
// - Inherits agency branding (logo, colors)
// - Agency has admin access
```

**Deliverable:** Agencies manage all clients from single dashboard

---

## Cost Analysis

### Infrastructure Costs for White-Label:

| Feature | Service | Cost |
|---------|---------|------|
| **Custom Domains** | Cloudflare Workers | $5/month (100K requests) |
| **SSL Certificates** | Let's Encrypt | Free (auto-renew) |
| **CDN for Widget** | Cloudflare CDN | $0-20/month |
| **Email (Custom Domains)** | SendGrid | $15/month (40K emails) |
| **Storage (Logos)** | Supabase Storage | Included in Pro plan |

**Total Additional Cost: ~$20-40/month**

---

## Revenue Model for Agencies

### Example Agency Economics:

**Agency pays DocsFlow:**
- Base platform: $500/month
- Per-client seat: $50/client/month
- Agency has 20 clients = $500 + ($50 × 20) = $1,500/month cost

**Agency charges clients:**
- "Premium AI Document Intelligence": $300/month/client
- 20 clients × $300 = $6,000/month revenue

**Agency profit:**
- $6,000 - $1,500 = $4,500/month margin (75% margin!)

**Why agencies love this:**
1. ✅ High margin (75%)
2. ✅ Low effort (you handle tech)
3. ✅ Recurring revenue
4. ✅ Upsell to existing clients (no acquisition cost)
5. ✅ White-label (clients think it's agency's product)

---

## Competitive Analysis: White-Label Platforms

### Who Does White-Label Well:

| Platform | White-Label Features | Pricing |
|----------|---------------------|---------|
| **Voiceflow** | Custom domains, logos, colors, embedded widgets | $500/month |
| **Bubble.io** | Full white-label, custom domains, branding | $349/month |
| **Retool** | Embeddable apps, custom branding | $50/user |
| **Memberstack** | White-label auth, custom domains | $300/month |

**Insight:** White-label is table stakes for B2B2B platforms at $500+/month

---

## Decision Framework

### Can You Launch Agency Strategy WITHOUT Full White-Label?

**Short Answer: YES, but limited** (6/10 viability)

**What You CAN Do Without Custom Domains:**

```
Agency pitch:
"We're partnering with DocsFlow (enterprise RAG platform) to offer 
document intelligence to our clients. You'll access via a secure 
subdomain: your-company.docsflow.app"

Positioning: "Powered by DocsFlow" (like "Powered by Stripe")
```

**Pros:**
- ✅ Can launch immediately
- ✅ Leverages DocsFlow brand (trust signal)
- ✅ No custom domain complexity

**Cons:**
- ❌ Agencies can't charge premium (clients know it's third-party)
- ❌ Agencies can't claim it's "our platform"
- ❌ Lower margins (clients expect lower prices)

**Result:** Works for small agencies ($200-500/month to you), not enterprise ($2K+/month)

---

### With Basic White-Label (Logo + Colors):

**Agency pitch:**
"Access your team's document intelligence portal at: portal.agencyname.com
[Shows agency logo, agency colors, agency branding]"

**Viability: 8/10**

**What's Missing:**
- Custom domain still shows `.docsflow.app` in browser
- Emails still from `@docsflow.app`

**But agencies can:**
- ✅ Say "our platform"
- ✅ Charge mid-tier prices ($200-400/client)
- ✅ Maintain client relationship

---

### With Full White-Label (Custom Domains + SSL + Emails):

**Agency pitch:**
"Welcome to AgencyName Intelligence Platform
Access at: portal.agencyname.com"

**Viability: 10/10**

**Agencies can:**
- ✅ Completely rebrand as their own
- ✅ Charge premium ($500-1000/client)
- ✅ Embed in their own sites
- ✅ Control entire client experience

---

## My Recommendation

### Phase 1 (Month 1): Launch WITHOUT White-Label
**Score: 6/10 viability**

**Strategy:**
- Target small agencies who are okay with "Powered by DocsFlow"
- Pitch as "infrastructure partner" not white-label
- Pricing: $500/month + $30/client
- Goal: 3-5 agency pilots, learn what they need

**Example Agencies:**
- Solo consultants
- Small marketing agencies (2-5 people)
- Fractional CFOs/COOs
- They're okay with third-party tools

---

### Phase 2 (Months 2-3): Add Basic White-Label
**Score: 8/10 viability**

**Features to Build:**
1. Logo upload (1 day)
2. Color scheme picker (2 days)
3. Remove "DocsFlow" branding conditionally (2 days)
4. Custom product name (1 day)

**Investment: 1 week**

**Result:** Agencies can say "our platform" with agency branding

---

### Phase 3 (Months 4-6): Add Custom Domains
**Score: 10/10 viability**

**Features to Build:**
1. Custom domain configuration (1 week)
2. SSL auto-provisioning (1 week)
3. Custom email domains (1 week)
4. Agency admin dashboard (1 week)

**Investment: 1 month**

**Result:** Full white-label, agencies charge $500-1K/client

---

## Bottom Line

### The Question: "Won't clients see DocsFlow?"

**Current State (No White-Label):**
- **YES, they will see DocsFlow everywhere** ❌
- Viability for agency strategy: **5/10**

**With Basic White-Label (Logo + Colors):**
- **They'll see agency branding, but URL is still *.docsflow.app** ⚠️
- Viability for agency strategy: **7/10**

**With Full White-Label (Custom Domains):**
- **No, they'll only see agency branding** ✅
- Viability for agency strategy: **9/10**

---

## Recommended Path Forward

### Week 1 (RIGHT NOW):
1. ✅ Fix embeddings (your current RAG issue)
2. ✅ Get 1-2 direct SME customers (proof points)

### Weeks 2-3:
1. ✅ Build basic white-label (logo upload, colors, remove branding)
2. ✅ Create agency pitch deck
3. ✅ Target 5-10 small agencies for pilots

### Month 2:
1. ✅ Run agency pilots (free for 90 days)
2. ✅ Learn what features they need
3. ✅ Validate if they can sell to clients

### Month 3-4:
1. ✅ Build custom domain support (if pilots succeed)
2. ✅ Build agency admin dashboard
3. ✅ Convert pilots to paying customers

**This approach:**
- ✅ Validates agency model before heavy investment
- ✅ Builds white-label incrementally based on real needs
- ✅ Gets you to market faster (don't build everything upfront)

---

## The Critical Insight

**You asked the right question:** "Won't they see DocsFlow?"

**Most people miss this detail and waste months building agency features no one uses.**

**Smart approach:**
1. Get 2-3 agencies piloting with basic branding (4 weeks)
2. See if they can actually sell to clients (30-60 days)
3. IF validated → invest in custom domains (1 month build)
4. IF not validated → pivot strategy

**Don't build custom domains until you know agencies can sell.**

Otherwise you spend 2 months building white-label features for a model that doesn't work.

---

## Final Answer

**Q: "How do agencies white-label? Won't clients see DocsFlow?"**

**A: Currently YES, but you can fix this in 3 stages:**

| Stage | Investment | Agency Viability | When to Build |
|-------|-----------|------------------|---------------|
| **No White-Label** | 0 days | 5/10 | NOW (test if agencies interested) |
| **Basic (Logo/Colors)** | 1 week | 7/10 | After 2-3 agency conversations |
| **Full (Custom Domains)** | 1 month | 9/10 | After pilot agencies prove they can sell |

**Don't build everything upfront. Build incrementally as you validate the model.**

This is the Lean Startup approach for enterprise features.

