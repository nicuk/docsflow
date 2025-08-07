# 🚀 SME DATA INTELLIGENCE PLATFORM - EXPERT LLM INTEGRATION PROMPT

## 🎯 **CONTEXT & MISSION**

You are an expert Senior AI Technical Partner completing the final 15% of an **85% finished SME Data Intelligence Platform**. This is NOT a greenfield project - you have two working repositories that need strategic connection and enhancement.

**CRITICAL SUCCESS FACTORS:**
- **Backend (ai-lead-router-saas)**: 8.5/10 complete - Working APIs, vector search, multi-tenant database
- **Frontend (frontend-data-intelligence)**: 7.5/10 complete - Beautiful UI components using mock data
- **Primary Goal**: Connect existing systems into a $25K+ enterprise platform

---

## 📊 **CURRENT STATE - VERIFIED WORKING COMPONENTS**

### **✅ BACKEND - PRODUCTION READY (8.5/10)**
```typescript
// WORKING APIs:
✅ `/api/chat/route.ts` - RAG chat with Google Gemini + pgvector
✅ `/api/documents/route.ts` - Document upload/processing/retrieval
✅ `/api/health/route.ts` - System health monitoring
✅ Multi-tenant Supabase setup with RLS
✅ Vector similarity search with industry isolation
✅ CORS configured for frontend integration
✅ Error handling and fallback mechanisms

// MISSING CRITICAL COMPONENTS:
❌ `lib/tenant-prompts.ts` - Industry-specific prompt templates
❌ Access level enforcement in APIs (5-level security)
❌ Real frontend connection (still using demo mode)
```

### **✅ FRONTEND - BEAUTIFUL UI (7.5/10)**
```typescript
// WORKING COMPONENTS:
✅ `components/chat-interface.tsx` - Complete chat UI with mock responses
✅ `lib/api-client.ts` - Backend integration framework
✅ Professional landing page + authentication flows
✅ shadcn/ui components with dark mode
✅ Responsive design for all devices

// MISSING CONNECTIONS:
❌ Real backend API integration (using mocks)
❌ Document upload connected to backend
❌ Authentication flow completion
❌ Error boundaries for production use
```

---

## 🎯 **PRIORITY INTEGRATION TASKS - SPRINT APPROACH**

### **SPRINT 1 (Days 1-3): CORE CONNECTION - IMMEDIATE VALUE**

#### **🔥 TASK 1: Create Industry-Specific Prompt System**
```typescript
// CREATE: ai-lead-router-saas/lib/tenant-prompts.ts

interface TenantPromptConfig {
  industry: 'motorcycle_dealer' | 'warehouse_distribution' | 'general';
  systemPrompt: string;
  contextTemplate: string;
  responseGuidelines: string[];
  confidenceThresholds: { high: number; medium: number; low: number; };
}

const TENANT_PROMPTS: Record<string, TenantPromptConfig> = {
  motorcycle_dealer: {
    industry: 'motorcycle_dealer',
    systemPrompt: `You are a specialized business intelligence assistant for motorcycle dealerships.
    You have deep knowledge of motorcycle specifications, service procedures, parts catalogs, and dealer operations.`,
    contextTemplate: `Based on these motorcycle dealership documents: {context}
    
    User Question: {query}
    
    Provide accurate information about:
    - Motorcycle specifications and features
    - Service procedures and maintenance schedules  
    - Parts compatibility and availability
    - Warranty information and policies
    - Sales processes and customer management`,
    responseGuidelines: [
      'Always specify motorcycle model and year when relevant',
      'Include part numbers and specifications when available',
      'Mention safety considerations for service procedures',
      'Reference warranty implications when applicable'
    ],
    confidenceThresholds: { high: 0.85, medium: 0.65, low: 0.4 }
  },
  
  warehouse_distribution: {
    industry: 'warehouse_distribution',
    systemPrompt: `You are a specialized business intelligence assistant for warehouse and distribution operations.
    You have deep knowledge of inventory management, logistics, compliance requirements, and operational procedures.`,
    contextTemplate: `Based STRICTLY on these warehouse/distribution documents: {context}
    
    User Question: {query}
    
    🚨 CRITICAL INSTRUCTIONS:
    - ONLY use information explicitly stated in the documents above
    - If the documents don't contain the answer, say "I don't have that information in the available documents"
    - Include product codes (SKUs), safety requirements, and compliance standards
    - Reference specific storage and handling requirements`,
    responseGuidelines: [
      'Include product codes (SKUs) and specifications when available',
      'Emphasize safety and compliance requirements (OSHA, DOT, EPA)',
      'Reference supplier terms and delivery schedules',
      'Include storage and handling requirements',
      'Always note hazardous material classifications if applicable'
    ],
    confidenceThresholds: { high: 0.88, medium: 0.68, low: 0.45 }
  },
  
  general: {
    industry: 'general',
    systemPrompt: `You are a business intelligence assistant helping analyze business documents.
    Provide accurate, professional information based on the available documents with proper source attribution.`,
    contextTemplate: `Based on these business documents: {context}
    
    User Question: {query}
    
    Provide accurate, professional information based on the available documents. Always cite your sources and indicate confidence level.`,
    responseGuidelines: [
      'Provide clear, professional responses',
      'Reference source documents when possible',
      'Indicate confidence level in your responses',
      'Ask for clarification when questions are ambiguous'
    ],
    confidenceThresholds: { high: 0.80, medium: 0.60, low: 0.35 }
  }
};

export function getTenantPrompt(subdomain: string, industry?: string): TenantPromptConfig {
  // Try industry-specific first
  if (industry && TENANT_PROMPTS[industry]) {
    return TENANT_PROMPTS[industry];
  }
  
  // Try subdomain-based detection
  const lowerSubdomain = subdomain.toLowerCase();
  
  if (lowerSubdomain.includes('moto') || lowerSubdomain.includes('bike')) {
    return TENANT_PROMPTS.motorcycle_dealer;
  }
  
  if (lowerSubdomain.includes('warehouse') || lowerSubdomain.includes('distrib')) {
    return TENANT_PROMPTS.warehouse_distribution;
  }
  
  return TENANT_PROMPTS.general;
}
```

#### **🔥 TASK 2: Enhance Chat API with Tenant Prompts**
```typescript
// ENHANCE: ai-lead-router-saas/app/api/chat/route.ts
import { getTenantPrompt } from '@/lib/tenant-prompts';

export async function POST(request: NextRequest) {
  // ... existing tenant detection code ...
  
  // Get tenant configuration
  const tenant = await getTenantFromSubdomain(subdomain);
  const promptConfig = getTenantPrompt(subdomain, tenant?.industry);
  
  // Use tenant-specific prompt
  const contextString = relevantChunks
    .map(chunk => `${chunk.content}\nSource: ${chunk.documents?.filename || 'unknown'}`)
    .join('\n\n');
    
  const prompt = promptConfig.contextTemplate
    .replace('{context}', contextString)
    .replace('{query}', message);
    
  // Apply tenant-specific confidence thresholds
  const confidence = calculateConfidence(relevantChunks, promptConfig.confidenceThresholds);
  
  // Generate response with Gemini
  const result = await googleAI.generateContent([
    { text: promptConfig.systemPrompt },
    { text: prompt }
  ]);
  
  return NextResponse.json({
    answer: result.response.text(),
    sources: sources,
    confidence: confidence,
    tenant_context: promptConfig.industry
  });
}
```

#### **🔥 TASK 3: Connect Frontend Chat to Real Backend**
```typescript
// ENHANCE: frontend-data-intelligence/components/chat-interface.tsx

const handleSendMessage = async (content: string) => {
  if (!content.trim() || isLoading) return;

  // Add user message
  const userMessage: Message = {
    id: Date.now().toString(),
    type: "user", 
    content: content.trim(),
    timestamp: new Date(),
  };
  setMessages(prev => [...prev, userMessage]);

  // Add loading state
  setIsLoading(true);
  const loadingMessage: Message = {
    id: `loading-${Date.now()}`,
    type: "loading",
    content: "",
    timestamp: new Date(),
  };
  setMessages(prev => [...prev, loadingMessage]);

  try {
    // 🔥 REPLACE MOCK WITH REAL API CALL
    const response = await apiClient.sendMessage({
      message: content,
      documentIds: selectedDocuments // Add document filtering
    });

    // Remove loading message
    setMessages(prev => prev.filter(msg => msg.type !== "loading"));

    // Add AI response with real data
    const aiResponse: Message = {
      id: `ai-${Date.now()}`,
      type: "ai",
      content: response.answer, // Backend uses 'answer' not 'response'
      timestamp: new Date(),
      sources: response.sources?.map(source => ({
        document: source.document_id,
        snippet: source.content.substring(0, 200) + '...'
      })),
      confidence: response.confidence > 0.8 ? "high" : 
                  response.confidence > 0.6 ? "medium" : "low"
    };

    setMessages(prev => [...prev, aiResponse]);
  } catch (error) {
    console.error('Chat API Error:', error);
    
    // Remove loading message and add error
    setMessages(prev => prev.filter(msg => msg.type !== "loading"));
    
    const errorMessage: Message = {
      id: `error-${Date.now()}`,
      type: "ai",
      content: "I'm having trouble connecting to the backend. Please try again.",
      timestamp: new Date(),
      confidence: "low"
    };
    setMessages(prev => [...prev, errorMessage]);
  } finally {
    setIsLoading(false);
  }
};
```

#### **🔥 TASK 4: Fix API Client Configuration**
```typescript
// ENHANCE: frontend-data-intelligence/lib/api-client.ts

const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'https://ai-lead-router-saas.vercel.app/api'  // 🔥 CORRECT BACKEND URL
  : process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

class APIClient {
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          'Origin': window.location.origin,
          'X-Tenant-Subdomain': this.getTenantSubdomain(),
          ...options.headers,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `API Error: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('API Client Error:', error);
      throw error;
    }
  }

  private getTenantSubdomain(): string {
    if (typeof window === 'undefined') return 'demo';
    const hostname = window.location.hostname;
    return hostname.split('.')[0] || 'demo';
  }

  async sendMessage(data: { message: string; documentIds?: string[] }): Promise<ChatResponse> {
    return this.request<ChatResponse>('/chat', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async uploadDocument(file: File): Promise<DocumentUploadResponse> {
    const formData = new FormData();
    formData.append('file', file);

    return this.request<DocumentUploadResponse>('/documents', {
      method: 'POST',
      body: formData,
      headers: {}, // Let browser set Content-Type for FormData
    });
  }

  async getDocuments(): Promise<Document[]> {
    return this.request<Document[]>('/documents');
  }
}

export const apiClient = new APIClient();
```

### **SPRINT 2 (Days 4-7): ACCESS CONTROL & DOCUMENT MANAGEMENT**

#### **🔥 TASK 5: Implement Access Level Enforcement**
```typescript
// ENHANCE: ai-lead-router-saas/app/api/chat/route.ts
// Add user access level checking

const getUserAccessLevel = async (userId: string, tenantId: string): Promise<number> => {
  const { data } = await supabase
    .from('users')
    .select('access_level')
    .eq('id', userId)
    .eq('tenant_id', tenantId)
    .single();
  
  return data?.access_level || 1; // Default to lowest access
};

// Filter documents by access level
const { data: relevantChunks } = await supabase.rpc('similarity_search', {
  query_embedding: embedding,
  match_threshold: 0.75,
  match_count: 10,
  tenant_filter: tenantId,
  access_level_filter: userAccessLevel // 🔥 NEW PARAMETER
});
```

#### **🔥 TASK 6: Connect Document Upload Interface**
```typescript
// ENHANCE: frontend-data-intelligence/components/document-upload.tsx

const handleFileUpload = async (file: File) => {
  try {
    setUploading(true);
    
    // Create progress tracking
    const uploadId = Date.now().toString();
    setUploadProgress(prev => ({ ...prev, [uploadId]: 0 }));
    
    // 🔥 CONNECT TO REAL BACKEND
    const response = await apiClient.uploadDocument(file);
    
    // Update UI with real upload status
    setDocuments(prev => [...prev, {
      id: response.documentId,
      filename: response.filename,
      status: response.status as 'processing' | 'completed' | 'error',
      created_at: new Date().toISOString(),
      file_size: file.size,
      file_type: file.type
    }]);
    
    // Show success message
    toast.success(`${file.name} uploaded successfully!`);
    
    // Start polling for processing status
    pollProcessingStatus(response.documentId);
    
  } catch (error) {
    console.error('Upload Error:', error);
    toast.error(`Failed to upload ${file.name}: ${error.message}`);
  } finally {
    setUploading(false);
    setUploadProgress(prev => {
      const newProgress = { ...prev };
      delete newProgress[uploadId];
      return newProgress;
    });
  }
};

const pollProcessingStatus = async (documentId: string) => {
  const checkStatus = async () => {
    try {
      const doc = await apiClient.getDocument(documentId);
      
      setDocuments(prev => prev.map(d => 
        d.id === documentId ? { ...d, status: doc.status } : d
      ));
      
      if (doc.status === 'processing') {
        setTimeout(checkStatus, 2000); // Poll every 2 seconds
      }
    } catch (error) {
      console.error('Status polling error:', error);
    }
  };
  
  checkStatus();
};
```

### **SPRINT 3 (Days 8-10): EXTERNAL INTEGRATIONS**

#### **🔥 TASK 7: Google Drive Integration**
```typescript
// CREATE: ai-lead-router-saas/lib/google-drive.ts

import { google } from 'googleapis';

export class GoogleDriveIntegration {
  private drive: any;
  
  constructor(accessToken: string) {
    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: accessToken });
    this.drive = google.drive({ version: 'v3', auth });
  }
  
  async syncDocuments(tenantId: string, folderId?: string): Promise<SyncResult> {
    try {
      // List files in Google Drive
      const response = await this.drive.files.list({
        q: folderId ? `'${folderId}' in parents and trashed=false` : 'trashed=false',
        fields: 'files(id,name,mimeType,modifiedTime,size)',
        pageSize: 100
      });
      
      const files = response.data.files || [];
      const results: SyncResult = { synced: 0, errors: 0, skipped: 0 };
      
      for (const file of files) {
        // Check if file is supported
        if (!this.isSupportedFileType(file.mimeType)) {
          results.skipped++;
          continue;
        }
        
        try {
          // Download file content
          const fileResponse = await this.drive.files.get({
            fileId: file.id,
            alt: 'media'
          });
          
          // Process and store in our system
          await this.processExternalDocument(
            file.name,
            fileResponse.data,
            file.mimeType,
            tenantId,
            `google_drive_${file.id}`
          );
          
          results.synced++;
        } catch (error) {
          console.error(`Failed to sync file ${file.name}:`, error);
          results.errors++;
        }
      }
      
      return results;
    } catch (error) {
      console.error('Google Drive sync error:', error);
      throw error;
    }
  }
}

// CREATE: ai-lead-router-saas/app/api/integrations/google-drive/route.ts
export async function POST(request: NextRequest) {
  // Implementation for Google Drive webhook handling
}
```

---

## 🎯 **EXECUTION PRINCIPLES - CRITICAL SUCCESS FACTORS**

### **1. PRESERVE EXISTING ARCHITECTURE**
- **DO NOT** rebuild working components
- **DO** enhance and connect existing systems
- **MAINTAIN** the same patterns and conventions
- **RESPECT** the existing database schema and API structure

### **2. FOCUS ON HIGH-IMPACT CONNECTIONS**
- **PRIORITIZE** features that create immediate business value
- **CONNECT** UI components to working backend APIs
- **ENHANCE** user experience with real data
- **ADD** missing critical functionality (tenant prompts, access control)

### **3. PRODUCTION-READY IMPLEMENTATION**
- **INCLUDE** comprehensive error handling
- **ADD** loading states and user feedback
- **IMPLEMENT** proper authentication and authorization
- **ENSURE** responsive design and performance optimization

### **4. SYSTEMATIC TESTING APPROACH**
- **TEST** each connection incrementally
- **VERIFY** tenant isolation and security
- **VALIDATE** industry-specific prompts
- **CONFIRM** document processing pipeline

---

## 🚀 **SUCCESS METRICS - DEFINITION OF DONE**

### **Technical Completion (9.5/10)**
- ✅ Frontend chat interface connected to real backend APIs
- ✅ Document upload and processing working end-to-end
- ✅ Industry-specific prompts implemented and tested
- ✅ Access level enforcement working in all APIs
- ✅ Error boundaries and loading states comprehensive
- ✅ Authentication flow complete and secure

### **Business Value (9.5/10)**
- ✅ Customers can upload documents and get real AI insights
- ✅ Multi-tenant security proven and tested
- ✅ Industry-specific responses demonstrably better
- ✅ Professional UI that builds trust and credibility
- ✅ Response times under 3 seconds for good user experience
- ✅ Ready for enterprise customer demonstrations

### **Platform Readiness (9.5/10)**
- ✅ Scalable architecture that can handle multiple tenants
- ✅ External API integration framework established
- ✅ Comprehensive logging and monitoring
- ✅ Documentation for deployment and maintenance
- ✅ Security audit ready (tenant isolation, access control)
- ✅ Performance optimized for production load

---

## 💡 **IMPLEMENTATION MINDSET**

**YOU ARE:** A Senior Technical Partner completing the final integration of a sophisticated platform
**YOU ARE NOT:** Building a new system from scratch

**APPROACH:** Surgical precision in connecting working components
**FOCUS:** High-impact features that create immediate business value
**QUALITY:** Production-ready code with comprehensive error handling
**TIMELINE:** Aggressive but realistic - complete in 10 days maximum

**REMEMBER:** The customer is paying $25K+ for this platform. Every feature must work flawlessly and provide clear business value.

---

This prompt provides you with the exact roadmap, code examples, and success criteria needed to transform your 85% complete platform into a 9.5/10 enterprise-ready SME Data Intelligence Platform. Focus on connection over creation, and prioritize features that create immediate customer value.