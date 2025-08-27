# SME DATA INTELLIGENCE PLATFORM - V3 SPRINT PLAN (CORRECTED)

## 🔍 PLATFORM AUDIT - ACTUAL CURRENT STATE (December 2024)

### **BRUTAL TRUTH - Platform Status**
- **Overall Platform Score: 6/10** - Partially functional but with critical issues
- **Backend (ai-lead-router-saas)**: 5/10 - Core functionality exists but vector search has issues
- **Frontend**: Not a separate repo - integrated in same codebase
- **Security**: 7/10 - Good tenant isolation, but authentication flow has issues
- **Production Readiness**: 60% - Major blockers need resolution

### **CRITICAL ISSUES IDENTIFIED**

#### 1. **Vector Search Error - "SET is not allowed in a non-volatile function"**
```sql
-- PROBLEM: Functions marked as STABLE but using SET LOCAL
-- Functions trying to use: SET LOCAL hnsw.ef = 100;
-- This requires VOLATILE function declaration
```

#### 2. **Authentication/Logout Issue**
- Users get forced back to subdomain after logout
- Middleware not properly clearing tenant context
- Cookie domain settings causing persistence issues
- Logout redirects to subdomain instead of main domain

#### 3. **Multiple Conflicting similarity_search Functions**
- Found 19+ different versions across migrations
- Some use `similarity_search`, others `similarity_search_v2`, `similarity_search_optimized`
- Parameter mismatches between TypeScript calls and SQL functions
- No clear "current" version being used

#### 4. **Frontend-Backend Integration**
- Frontend and backend are in SAME repository (not separate)
- Chat interface exists but mock data still partially in use
- API client configured but not all endpoints connected
- Document upload UI exists but processing pipeline incomplete

---

## 🎯 CORRECTED PLATFORM ARCHITECTURE

### **Repository Structure (ACTUAL)**
```
ai-lead-router-saas/
├── app/                    # Next.js app directory
│   ├── api/               # Backend API routes
│   ├── dashboard/         # Dashboard pages
│   ├── login/            # Auth pages
│   └── onboarding/       # Onboarding flow
├── components/            # React components
├── lib/                  # Backend utilities
├── lib-frontend/         # Frontend utilities
├── migrations/           # Database migrations (81 files!)
├── middleware.ts         # Tenant routing middleware
└── types/               # TypeScript definitions
```

### **Tech Stack (VERIFIED)**
- **Framework**: Next.js 14+ (App Router)
- **Database**: Supabase PostgreSQL with pgvector
- **AI**: Google Gemini 2.0 Flash
- **Cache**: Redis (Upstash)
- **Auth**: Supabase Auth with custom middleware
- **Deployment**: Vercel
- **Vector Search**: pgvector with HNSW indexing

---

## 🚨 SPRINT 0: EMERGENCY FIXES (Day 1)

### **ATOMIC WORKFLOW 1: Fix Vector Search Function**

#### Step 1.1: Identify Current Active Function
```bash
# Connect to Supabase SQL Editor and run:
SELECT proname, prosrc 
FROM pg_proc 
WHERE proname LIKE 'similarity_search%'
ORDER BY proname;
```

#### Step 1.2: Apply Consolidated Fix
```sql
-- migrations/CONSOLIDATED_VECTOR_FIX_V3.sql

-- Drop all conflicting versions
DROP FUNCTION IF EXISTS similarity_search CASCADE;
DROP FUNCTION IF EXISTS similarity_search_v2 CASCADE;
DROP FUNCTION IF EXISTS similarity_search_optimized CASCADE;

-- Create single authoritative version
CREATE OR REPLACE FUNCTION similarity_search(
  query_embedding vector(768),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 10,
  tenant_filter uuid DEFAULT NULL,
  access_level_filter int DEFAULT 5
)
RETURNS TABLE (
  id uuid,
  content text,
  similarity float,
  document_id uuid,
  chunk_index int,
  metadata jsonb,
  access_level int,
  filename text
)
LANGUAGE plpgsql 
VOLATILE -- CRITICAL: Must be VOLATILE to use SET LOCAL
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- HNSW optimization (now allowed with VOLATILE)
  SET LOCAL hnsw.ef = 100;
  
  RETURN QUERY
  SELECT 
    dc.id,
    dc.content,
    1 - (dc.embedding <=> query_embedding) as similarity,
    dc.document_id,
    dc.chunk_index,
    dc.metadata,
    dc.access_level,
    COALESCE(d.filename, 'unknown') as filename
  FROM document_chunks dc
  LEFT JOIN documents d ON d.id = dc.document_id
  WHERE 
    dc.embedding IS NOT NULL
    AND (tenant_filter IS NULL OR dc.tenant_id = tenant_filter)
    AND dc.access_level <= access_level_filter
    AND 1 - (dc.embedding <=> query_embedding) > match_threshold
  ORDER BY dc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION similarity_search TO authenticated;
GRANT EXECUTE ON FUNCTION similarity_search TO anon;
```

#### Step 1.3: Update TypeScript to Match
```typescript
// lib/hybrid-search.ts - Line 236-244
const { data: vectorResults, error: vectorError } = await this.supabase.rpc(
  'similarity_search', // Use standard name, not _v2 or _optimized
  {
    query_embedding: queryEmbedding,
    match_threshold: threshold,
    match_count: maxResults,
    tenant_filter: tenantId, // Already UUID
    access_level_filter: accessLevel
  }
);
```

### **ATOMIC WORKFLOW 2: Fix Logout/Subdomain Persistence**

#### Step 2.1: Fix Logout API Route
```typescript
// app/api/auth/logout/route.ts
export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    
    // 1. Clear Supabase session
    if (authToken) {
      await supabaseAdmin.auth.admin.signOut(authToken);
    }
    
    // 2. Clear Redis cache
    if (tenantId || tenantSubdomain) {
      await redis?.del(`tenant:${tenantId}`);
      await redis?.del(`subdomain:${tenantSubdomain}`);
    }
    
    // 3. CRITICAL FIX: Force redirect to main domain
    const response = NextResponse.json(
      { 
        success: true, 
        redirectUrl: 'https://docsflow.app/login' // Always main domain
      },
      { status: 200 }
    );
    
    // 4. Clear ALL cookies at root domain level
    const cookiesToClear = [
      'auth-token', 'access_token', 'refresh_token',
      'tenant-id', 'tenant-subdomain', 'user-email'
    ];
    
    cookiesToClear.forEach(name => {
      // Clear at all domain levels
      response.cookies.set(name, '', {
        maxAge: 0,
        path: '/',
        domain: '.docsflow.app' // Root domain
      });
      response.cookies.set(name, '', {
        maxAge: 0,
        path: '/'
      });
    });
    
    return response;
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json({ error: 'Logout failed' }, { status: 500 });
  }
}
```

#### Step 2.2: Fix Frontend Logout Handler
```typescript
// lib/auth-client.ts - Line 158-228
async logout(): Promise<void> {
  try {
    // 1. Call backend logout
    const response = await fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'include'
    });
    
    if (response.ok) {
      const data = await response.json();
      
      // 2. Clear all local storage
      localStorage.clear();
      
      // 3. CRITICAL: Use window.location for hard redirect
      // This escapes the subdomain context completely
      window.location.href = data.redirectUrl || 'https://docsflow.app/login';
      return; // Stop execution here
    }
  } catch (error) {
    console.error('Logout error:', error);
  }
  
  // Fallback: Force redirect to main domain
  window.location.href = 'https://docsflow.app/login';
}
```

#### Step 2.3: Update Middleware Tenant Handling
```typescript
// middleware.ts - Add after line 169
// Clear tenant context on logout path
if (pathname === '/logout' || pathname.includes('/api/auth/logout')) {
  const response = NextResponse.next();
  // Clear all tenant-related headers
  response.headers.delete('x-tenant-id');
  response.headers.delete('x-tenant-subdomain');
  return response;
}
```

---

## 📋 SPRINT 1: CORE FUNCTIONALITY (Days 2-3)

### **ATOMIC WORKFLOW 3: Complete Chat Integration**

#### Step 3.1: Remove Mock Data from Frontend
```typescript
// components/chat-interface.tsx
// DELETE all mock response code
// REPLACE with actual API call:

const handleSendMessage = async (content: string) => {
  try {
    setIsLoading(true);
    
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Tenant-Subdomain': window.location.hostname.split('.')[0]
      },
      body: JSON.stringify({ 
        message: content,
        conversationId: currentConversationId 
      })
    });
    
    if (!response.ok) throw new Error('Chat request failed');
    
    const data = await response.json();
    
    // Add AI response to messages
    setMessages(prev => [...prev, {
      id: Date.now().toString(),
      type: 'ai',
      content: data.answer,
      sources: data.sources,
      confidence: data.confidence
    }]);
    
  } catch (error) {
    console.error('Chat error:', error);
    // Show error message to user
  } finally {
    setIsLoading(false);
  }
};
```

#### Step 3.2: Fix Hybrid Search Integration
```typescript
// app/api/chat/route.ts - Line 104-250
// Ensure proper error handling for vector search
try {
  const { HybridSearch } = await loadHybridSearch();
  const hybridSearch = new HybridSearch();
  
  const searchResult = await hybridSearch.performHybridSearch(
    message,
    tenantUuid,
    userAccessLevel,
    {
      vectorThreshold: 0.75,
      maxResults: 10,
      includeKeywordSearch: true
    }
  );
  
  // Handle case where vector search fails but keyword works
  if (searchResult.vectorResults === 0 && searchResult.keywordResults > 0) {
    console.warn('Vector search failed, using keyword results only');
  }
  
} catch (searchError) {
  console.error('Search failed:', searchError);
  
  // Fallback to keyword-only search
  const keywordResults = await performKeywordFallback(message, tenantUuid);
  // ... continue with keyword results
}
```

### **ATOMIC WORKFLOW 4: Document Processing Pipeline**

#### Step 4.1: Fix Document Upload Endpoint
```typescript
// app/api/documents/route.ts
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    // 1. Validate file
    if (!file || file.size === 0) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }
    
    // 2. Get tenant context
    const tenantId = request.headers.get('x-tenant-subdomain');
    if (!tenantId) {
      return NextResponse.json({ error: 'No tenant context' }, { status: 400 });
    }
    
    // 3. Upload to Supabase Storage
    const fileName = `${tenantId}/${Date.now()}_${file.name}`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('documents')
      .upload(fileName, file);
    
    if (uploadError) throw uploadError;
    
    // 4. Create document record
    const { data: document, error: docError } = await supabase
      .from('documents')
      .insert({
        tenant_id: tenantId,
        filename: file.name,
        file_path: uploadData.path,
        file_size: file.size,
        file_type: file.type,
        status: 'processing'
      })
      .select()
      .single();
    
    if (docError) throw docError;
    
    // 5. Trigger async processing
    await processDocument(document.id);
    
    return NextResponse.json({
      documentId: document.id,
      filename: file.name,
      status: 'processing'
    });
    
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}
```

#### Step 4.2: Implement Document Processing
```typescript
// lib/document-processor.ts
import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function processDocument(documentId: string) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  
  const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY!);
  const embeddingModel = genAI.getGenerativeModel({ model: 'text-embedding-004' });
  
  try {
    // 1. Get document
    const { data: document } = await supabase
      .from('documents')
      .select('*')
      .eq('id', documentId)
      .single();
    
    // 2. Download file from storage
    const { data: fileData } = await supabase.storage
      .from('documents')
      .download(document.file_path);
    
    // 3. Extract text (implement based on file type)
    const text = await extractText(fileData, document.file_type);
    
    // 4. Chunk text
    const chunks = chunkText(text, 1000, 200); // 1000 chars, 200 overlap
    
    // 5. Generate embeddings and store chunks
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      
      // Generate embedding
      const result = await embeddingModel.embedContent(chunk);
      const embedding = result.embedding.values;
      
      // Store chunk with embedding
      await supabase.from('document_chunks').insert({
        document_id: documentId,
        tenant_id: document.tenant_id,
        content: chunk,
        chunk_index: i,
        embedding: embedding,
        metadata: {
          filename: document.filename,
          chunk_number: i + 1,
          total_chunks: chunks.length
        }
      });
    }
    
    // 6. Update document status
    await supabase
      .from('documents')
      .update({ status: 'completed' })
      .eq('id', documentId);
      
  } catch (error) {
    console.error('Processing error:', error);
    
    await supabase
      .from('documents')
      .update({ 
        status: 'error',
        error_message: error.message 
      })
      .eq('id', documentId);
  }
}

function chunkText(text: string, chunkSize: number, overlap: number): string[] {
  const chunks: string[] = [];
  let start = 0;
  
  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length);
    chunks.push(text.slice(start, end));
    start += chunkSize - overlap;
  }
  
  return chunks;
}
```

---

## 🚀 SPRINT 2: TENANT & SECURITY (Days 4-5)

### **ATOMIC WORKFLOW 5: Fix Tenant Isolation**

#### Step 5.1: Add Tenant Validation to All API Routes
```typescript
// lib/api-tenant-validation.ts
export async function validateTenantAccess(
  request: NextRequest,
  requiredAccessLevel: number = 1
): Promise<{ valid: boolean; tenantId?: string; userId?: string; error?: string }> {
  try {
    // Get tenant from header (set by middleware)
    const tenantSubdomain = request.headers.get('x-tenant-subdomain');
    if (!tenantSubdomain) {
      return { valid: false, error: 'No tenant context' };
    }
    
    // Get auth token
    const authToken = request.cookies.get('access_token')?.value;
    if (!authToken) {
      return { valid: false, error: 'Not authenticated' };
    }
    
    // Verify user belongs to tenant
    const { data: user } = await supabase
      .from('users')
      .select('id, tenant_id, access_level')
      .eq('auth_id', authToken)
      .single();
    
    if (!user) {
      return { valid: false, error: 'User not found' };
    }
    
    // Verify tenant match
    const { data: tenant } = await supabase
      .from('tenants')
      .select('id')
      .eq('subdomain', tenantSubdomain)
      .single();
    
    if (!tenant || tenant.id !== user.tenant_id) {
      return { valid: false, error: 'Tenant mismatch' };
    }
    
    // Check access level
    if (user.access_level < requiredAccessLevel) {
      return { valid: false, error: 'Insufficient access' };
    }
    
    return { 
      valid: true, 
      tenantId: tenant.id, 
      userId: user.id 
    };
    
  } catch (error) {
    console.error('Tenant validation error:', error);
    return { valid: false, error: 'Validation failed' };
  }
}

// Use in API routes:
export async function POST(request: NextRequest) {
  const validation = await validateTenantAccess(request, 1);
  if (!validation.valid) {
    return NextResponse.json({ error: validation.error }, { status: 403 });
  }
  
  // Continue with validated tenant context
  const { tenantId, userId } = validation;
  // ...
}
```

### **ATOMIC WORKFLOW 6: Implement Access Control**

#### Step 6.1: Add RLS Policies for Document Access
```sql
-- migrations/document_access_control.sql

-- Ensure users can only see documents from their tenant
CREATE POLICY "tenant_document_isolation" ON documents
  FOR ALL USING (
    tenant_id = (
      SELECT tenant_id FROM users 
      WHERE id = auth.uid()
    )
  );

-- Ensure chunk access respects document permissions
CREATE POLICY "chunk_tenant_isolation" ON document_chunks
  FOR SELECT USING (
    tenant_id = (
      SELECT tenant_id FROM users 
      WHERE id = auth.uid()
    )
    AND access_level <= (
      SELECT access_level FROM users 
      WHERE id = auth.uid()
    )
  );
```

---

## 🎯 SPRINT 3: PRODUCTION READINESS (Days 6-7)

### **ATOMIC WORKFLOW 7: Performance Optimization**

#### Step 7.1: Add Response Caching
```typescript
// lib/cache-manager.ts
import { redis } from '@/lib/redis';

export class CacheManager {
  private ttl: number = 3600; // 1 hour default
  
  async getCachedResponse(key: string): Promise<any | null> {
    try {
      const cached = await redis.get(key);
      if (cached) {
        console.log(`Cache hit: ${key}`);
        return JSON.parse(cached);
      }
    } catch (error) {
      console.error('Cache get error:', error);
    }
    return null;
  }
  
  async setCachedResponse(key: string, data: any, ttl?: number): Promise<void> {
    try {
      await redis.set(
        key, 
        JSON.stringify(data),
        { ex: ttl || this.ttl }
      );
      console.log(`Cached: ${key}`);
    } catch (error) {
      console.error('Cache set error:', error);
    }
  }
  
  generateCacheKey(query: string, tenantId: string): string {
    const normalized = query.toLowerCase().trim();
    return `chat:${tenantId}:${Buffer.from(normalized).toString('base64').slice(0, 50)}`;
  }
}
```

### **ATOMIC WORKFLOW 8: Error Boundaries & Monitoring**

#### Step 8.1: Add Global Error Handler
```typescript
// app/api/middleware.ts
export function withErrorHandler(handler: Function) {
  return async (request: NextRequest) => {
    try {
      return await handler(request);
    } catch (error) {
      console.error('API Error:', error);
      
      // Log to monitoring service
      if (process.env.NODE_ENV === 'production') {
        // await logToSentry(error, request);
      }
      
      // Return user-friendly error
      return NextResponse.json(
        { 
          error: 'An error occurred processing your request',
          requestId: crypto.randomUUID()
        },
        { status: 500 }
      );
    }
  };
}
```

---

## ✅ DEFINITION OF DONE - SPRINT DELIVERABLES

### **Sprint 0 Completion (Day 1)**
- [ ] Vector search working without errors
- [ ] Logout properly clears subdomain context
- [ ] Users can switch between tenants cleanly

### **Sprint 1 Completion (Days 2-3)**
- [ ] Chat interface connected to real backend
- [ ] Document upload and processing working
- [ ] Search returns actual document content

### **Sprint 2 Completion (Days 4-5)**
- [ ] Tenant isolation verified and secure
- [ ] Access control enforced at all levels
- [ ] RLS policies protecting all data

### **Sprint 3 Completion (Days 6-7)**
- [ ] Response times < 2 seconds
- [ ] Error handling comprehensive
- [ ] Monitoring and logging in place

---

## 🔄 TESTING CHECKLIST

### **User Flow Testing**
```javascript
// test/user-flow.test.js

// 1. Registration Flow
- User can register on main domain
- Tenant gets created correctly
- User redirected to subdomain dashboard

// 2. Login/Logout Flow  
- User can login on subdomain
- Session persists across pages
- Logout clears all cookies and redirects to main domain
- User cannot access other tenant subdomains

// 3. Document Flow
- User can upload documents
- Processing completes successfully
- Documents appear in sidebar
- Search finds document content

// 4. Chat Flow
- User can send messages
- AI responds with relevant content
- Sources are properly cited
- Confidence scores displayed
```

### **Security Testing**
```bash
# Test tenant isolation
curl -X POST https://tenant1.docsflow.app/api/chat \
  -H "Cookie: access_token=tenant2_token" \
  # Should return 403 Forbidden

# Test access control
curl -X GET https://tenant1.docsflow.app/api/documents \
  -H "Cookie: access_token=low_access_token" \
  # Should only return permitted documents
```

---

## 📊 SUCCESS METRICS

### **Technical Metrics**
- **API Response Time**: P95 < 2 seconds
- **Vector Search Accuracy**: > 85% relevant results
- **Document Processing**: < 30 seconds for 10-page PDF
- **Uptime**: 99.9% availability

### **Business Metrics**
- **User Onboarding**: < 5 minutes to first query
- **Document Ingestion**: 100+ documents per tenant
- **Query Volume**: 1000+ queries per day
- **Tenant Isolation**: Zero cross-tenant data leaks

---

## 🚦 CURRENT BLOCKERS & SOLUTIONS

| Blocker | Impact | Solution | Priority |
|---------|--------|----------|----------|
| Vector function errors | Chat broken | Apply VOLATILE fix | P0 |
| Logout subdomain persistence | Poor UX | Fix cookie domains | P0 |
| Multiple function versions | Confusion | Consolidate to one | P1 |
| Mock data in frontend | Not production ready | Connect real APIs | P1 |
| Document processing incomplete | Can't ingest docs | Implement processor | P1 |

---

## 💡 KEY INSIGHTS FROM AUDIT

1. **The platform is closer to production than V2 suggested (60% vs 30%)**
2. **Main issues are configuration/integration, not missing features**
3. **Frontend and backend are integrated, not separate repos**
4. **Vector search issue is a simple function declaration fix**
5. **Authentication works but cookie management needs fixing**

---

## 🎯 NEXT STEPS (IMMEDIATE ACTIONS)

1. **Run the vector fix SQL immediately** (5 minutes)
2. **Deploy logout fix** (30 minutes)
3. **Remove mock data from chat** (1 hour)
4. **Test end-to-end flow** (30 minutes)
5. **Deploy to staging** (1 hour)

**Estimated Time to Production: 5-7 days** (not 2-3 weeks as V2 suggested)

---

*This V3 plan is based on actual code analysis and reflects the true state of your platform. The issues are more about configuration and integration than missing functionality.*
