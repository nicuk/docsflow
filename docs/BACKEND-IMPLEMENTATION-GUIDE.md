# Backend Implementation Guide - AI Lead Router SaaS
## ACTUAL Implementation Status & Required Work

**Status**: 3/10 - Basic APIs exist but NO core features work
**Last Updated**: January 2025

---

## **🚨 REALITY CHECK: What's ACTUALLY Built**

### **✅ What EXISTS (Barely Working)**
- Basic Express/Next.js API routes
- CORS configuration (recently fixed)
- Mock Gemini integration for chat
- Demo tenant creation
- Basic document upload endpoint (untested)

### **❌ What's MISSING (Critical Features)**
- **NO Supabase Auth** - Just mock tokens
- **NO LLM Persona Generation** - Rule-based only
- **NO Real Tenant Management** - No subdomain routing
- **NO Document Processing** - Upload exists but no embeddings
- **NO User Isolation** - Everything shares same context

---

## **📋 BACKEND TEAM: YOUR IMMEDIATE TASKS**

### **WEEK 1: Make Authentication Real (P0)**

#### **Day 1-2: Supabase Auth Integration**
```typescript
// 1. Install dependencies
npm install @supabase/supabase-js @supabase/auth-helpers-nextjs

// 2. Create lib/supabase-server.ts
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

export const createServerClient = () => {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        persistSession: false
      }
    }
  )
}

// 3. Replace ALL mock auth in routes
// FROM:
document.cookie = 'auth-token=mock-token'

// TO:
const { data: { user }, error } = await supabase.auth.signUp({
  email,
  password
})
```

#### **Day 3: Onboarding API Endpoint**
```typescript
// Create app/api/onboarding/complete/route.ts
export async function POST(request: NextRequest) {
  const supabase = createServerClient()
  
  // Get authenticated user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return unauthorized()
  
  const { answers } = await request.json()
  
  // Step 1: Generate LLM persona
  const persona = await generateLLMPersona(answers)
  
  // Step 2: Create tenant
  const { data: tenant } = await supabase
    .from('tenants')
    .insert({
      name: answers.businessName,
      subdomain: generateUniqueSubdomain(answers.businessName),
      industry: detectIndustry(answers),
      custom_persona: persona,
      owner_id: user.id
    })
    .select()
    .single()
  
  // Step 3: Add user to tenant
  await supabase
    .from('users')
    .update({ 
      tenant_id: tenant.id,
      onboarding_completed: true 
    })
    .eq('id', user.id)
  
  return NextResponse.json({
    success: true,
    tenant: {
      id: tenant.id,
      subdomain: tenant.subdomain,
      redirectUrl: `https://${tenant.subdomain}.${process.env.BASE_DOMAIN}`
    }
  })
}
```

#### **Day 4-5: LLM Persona Generation**
```typescript
// lib/persona-generator.ts
import { ChatOpenAI } from '@langchain/openai'

export async function generateLLMPersona(answers: OnboardingAnswers) {
  const llm = new ChatOpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    model: 'gpt-4-turbo-preview'
  })
  
  const prompt = `
Create a custom AI assistant persona based on these business details:

Business: ${answers.businessOverview}
Challenges: ${answers.dailyChallenges}
Decisions: ${answers.keyDecisions}
Success Metrics: ${answers.successMetrics}
Information Needs: ${answers.informationNeeds}

Generate a JSON persona with:
- role: Specific expert role for this business
- tone: Communication style matching their needs
- focus_areas: Array of 3-5 key areas to focus on
- technical_level: How technical to be in responses
- prompt_template: A comprehensive system prompt for the AI

Make it HIGHLY specific to their industry and challenges.
`

  const response = await llm.invoke(prompt)
  return JSON.parse(response.content)
}
```

---

### **WEEK 2: Make Documents Work (P1)**

#### **Document Processing Pipeline**
```typescript
// app/api/documents/upload/route.ts
export async function POST(request: NextRequest) {
  const supabase = createServerClient()
  const { user } = await requireAuth(request)
  
  const formData = await request.formData()
  const file = formData.get('file') as File
  
  // Step 1: Upload to Supabase Storage
  const filename = `${user.tenant_id}/${Date.now()}-${file.name}`
  const { data: upload } = await supabase.storage
    .from('documents')
    .upload(filename, file)
  
  // Step 2: Create document record
  const { data: document } = await supabase
    .from('documents')
    .insert({
      filename: file.name,
      storage_path: filename,
      tenant_id: user.tenant_id,
      uploaded_by: user.id,
      processing_status: 'pending'
    })
    .select()
    .single()
  
  // Step 3: Queue for processing
  await processDocument(document.id)
  
  return NextResponse.json({ 
    success: true, 
    documentId: document.id 
  })
}

// lib/document-processor.ts
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter'
import { OpenAIEmbeddings } from '@langchain/openai'

export async function processDocument(documentId: string) {
  // 1. Extract text from PDF/DOCX/TXT
  const text = await extractText(documentId)
  
  // 2. Split into chunks
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 1000,
    chunkOverlap: 200
  })
  const chunks = await splitter.splitText(text)
  
  // 3. Generate embeddings
  const embeddings = new OpenAIEmbeddings()
  const vectors = await embeddings.embedDocuments(chunks)
  
  // 4. Store in vector database
  for (let i = 0; i < chunks.length; i++) {
    await supabase
      .from('document_chunks')
      .insert({
        document_id: documentId,
        chunk_index: i,
        content: chunks[i],
        embedding: vectors[i],
        tenant_id: document.tenant_id
      })
  }
  
  // 5. Update document status
  await supabase
    .from('documents')
    .update({ processing_status: 'completed' })
    .eq('id', documentId)
}
```

---

## **🔌 FRONTEND INTEGRATION POINTS**

### **Auth Endpoints (BACKEND MUST PROVIDE)**
```typescript
// What Frontend Expects:
POST /api/auth/register
Body: { email, password, name }
Response: { user: { id, email }, session: { access_token } }

POST /api/auth/login  
Body: { email, password }
Response: { user: { id, email }, session: { access_token } }

POST /api/auth/logout
Headers: Authorization: Bearer <token>
Response: { success: true }

GET /api/auth/me
Headers: Authorization: Bearer <token>
Response: { user: { id, email, tenant_id, tenant } }
```

### **Onboarding Endpoint (BACKEND MUST PROVIDE)**
```typescript
POST /api/onboarding/complete
Headers: Authorization: Bearer <token>
Body: {
  answers: {
    businessOverview: string,
    dailyChallenges: string,
    keyDecisions: string,
    successMetrics: string,
    informationNeeds: string
  }
}
Response: {
  success: true,
  tenant: {
    id: string,
    subdomain: string,
    redirectUrl: string
  }
}
```

---

## **⚠️ CURRENT BLOCKERS**

### **Environment Variables Needed**
```env
# Supabase (MISSING)
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_ANON_KEY=

# OpenAI (MISSING)
OPENAI_API_KEY=

# Domain Config
BASE_DOMAIN=docsflow.app
```

### **Database Migrations Needed**
```sql
-- Add custom_persona to tenants
ALTER TABLE tenants 
ADD COLUMN custom_persona JSONB;

-- Add onboarding_completed to users
ALTER TABLE users
ADD COLUMN onboarding_completed BOOLEAN DEFAULT FALSE;

-- Create document_chunks table
CREATE TABLE document_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES documents(id),
  tenant_id UUID REFERENCES tenants(id),
  chunk_index INTEGER,
  content TEXT,
  embedding vector(1536),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## **✅ DEFINITION OF BACKEND DONE**

### **Phase 1: Authentication (5 days)**
- [ ] Supabase client configured
- [ ] Register endpoint works
- [ ] Login endpoint works  
- [ ] Protected routes require valid tokens
- [ ] User-tenant association works

### **Phase 2: Onboarding (3 days)**
- [ ] Onboarding API accepts answers
- [ ] LLM generates custom personas
- [ ] Tenants created with subdomains
- [ ] Users assigned to tenants
- [ ] Frontend can complete flow

### **Phase 3: Documents (5 days)**
- [ ] Upload to Supabase Storage
- [ ] Text extraction works
- [ ] Embeddings generated
- [ ] Vector search works
- [ ] Chat references documents

---

## **📊 BACKEND METRICS**

| Metric | Current | Must Have | Target |
|--------|---------|-----------|---------|
| **Auth Success** | 0% (mock) | 95% | 99% |
| **API Latency** | Unknown | < 500ms | < 200ms |
| **Document Processing** | None | < 60s | < 30s |
| **Persona Quality** | 0% | Working | 90% relevant |
| **Uptime** | Unknown | 99% | 99.9% |

**Current Backend Score: 3/10**
**Target After Implementation: 8/10** 