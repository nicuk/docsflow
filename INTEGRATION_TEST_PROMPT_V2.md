
# 🔥 BRUTAL SYSTEM AUDIT PROMPT

## **CRITICAL AUDIT PHILOSOPHY**
"Audit what EXISTS, not what you THINK exists. Verify REAL implementations, not assumptions."

---

## **📋 COMPREHENSIVE SYSTEM AUDIT CHECKLIST**

### **1. DEPLOYMENT REALITY CHECK FIRST** 
```bash
# ALWAYS verify actual deployed systems before auditing
# Check Vercel/hosting dashboards for real URLs
# Never assume what's deployed matches what's documented
```

**Critical Questions:**
- What is the ACTUAL frontend domain and deployment status?
- What is the ACTUAL backend API domain and deployment status? 
- Are there multiple environments (staging/prod/dev)?
- What version of the code is actually deployed vs. local?
- Are environment variables properly configured in production?

### **2. ARCHITECTURE DISCOVERY**
```bash
# Analyze real repository structure and implementations
# Check actual file existence, not documentation claims
```

**Deep Dive Analysis:**
- What middleware actually exists in each repository?
- What API routes are implemented vs. documented?
- What database schema is actually deployed?
- What authentication system is really configured?
- What third-party integrations are active?

### **3. USER FLOW TRACING**
```bash
# Trace every possible user path through the system
# Test edge cases and error conditions
```

**Complete Flow Analysis:**
- Landing page → Registration → Onboarding → Dashboard
- Authentication flow → Token handling → Session management
- Tenant creation → Subdomain routing → Access control
- Document upload → Processing → Vector storage → Search
- Chat interaction → AI processing → Response generation
- Error scenarios → Fallback mechanisms → Recovery paths

### **4. DATA FLOW VERIFICATION**
```bash
# Verify how data moves between components
# Check for data consistency and isolation
```

**Data Architecture Questions:**
- How is user data actually stored and retrieved?
- Is tenant isolation properly implemented in the database?
- How are file uploads processed and stored?
- Are vector embeddings generated and searchable?
- Is there data synchronization between systems?

### **5. SECURITY & ACCESS CONTROL AUDIT**
```bash
# Verify authentication, authorization, and tenant isolation
# Check for security vulnerabilities and data leakage
```

**Security Analysis:**
- Is authentication properly implemented across all routes?
- Are API endpoints protected with proper middleware?
- Is tenant data properly isolated and access-controlled?
- Are there any cross-tenant data leakage risks?
- Is input validation and sanitization implemented?

### **6. PERFORMANCE & SCALABILITY ASSESSMENT**
```bash
# Analyze system performance and bottlenecks
# Check resource usage and optimization opportunities
```

**Performance Questions:**
- What are the actual response times for key operations?
- Are there any obvious performance bottlenecks?
- Is the system optimized for concurrent users?
- Are database queries efficient and indexed?
- Is caching properly implemented?

### **7. ERROR HANDLING & RELIABILITY**
```bash
# Test system behavior under failure conditions
# Verify error recovery and user experience
```

**Reliability Analysis:**
- How does the system handle API failures?
- Are error messages user-friendly and actionable?
- Is there proper logging and monitoring in place?
- Are there graceful fallbacks for service outages?
- Is the system resilient to partial failures?

---
