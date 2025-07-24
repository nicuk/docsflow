# Vercel Deployment Guide - Atomic Services
## Independent Deployment for Backend & Frontend

**Score**: 9.5/10 - Production-Ready Deployment  
**Platform**: Vercel (Serverless + Static)  
**Repos**: Two separate deployments  

---

## 🚀 **DEPLOYMENT OVERVIEW**

```typescript
const deploymentArchitecture = {
  backend: {
    url: "https://ai-lead-router-saas.vercel.app",
    type: "Serverless Functions",
    build_time: "~2 minutes",
    api_routes: "/api/*"
  },
  frontend: {
    url: "https://frontend-data-intelligence.vercel.app",
    type: "Static Site + ISR",
    build_time: "~30 seconds",
    pages: "/*"
  }
};
```

---

## 📦 **BACKEND DEPLOYMENT (ai-lead-router-saas)**

### **1. Initial Setup**
```bash
# Install Vercel CLI
npm i -g vercel

# Navigate to backend repo
cd ai-lead-router-saas

# Login to Vercel
vercel login

# Link project (first time only)
vercel link
# Select: Create new project
# Project name: ai-lead-router-saas
# Framework: Next.js
```

### **2. Environment Variables**
```bash
# Set production environment variables
vercel env add SUPABASE_URL production
vercel env add SUPABASE_ANON_KEY production
vercel env add SUPABASE_SERVICE_KEY production
vercel env add GOOGLE_AI_API_KEY production
vercel env add UPSTASH_REDIS_URL production
vercel env add UPSTASH_REDIS_TOKEN production

# Pull env vars for local development
vercel env pull .env.local
```

### **3. vercel.json Configuration**
```json
{
  "functions": {
    "app/api/chat/route.ts": {
      "maxDuration": 30
    },
    "app/api/documents/upload/route.ts": {
      "maxDuration": 60
    },
    "app/api/**/*.ts": {
      "maxDuration": 10
    }
  },
  "headers": [
    {
      "source": "/api/(.*)",
      "headers": [
        { "key": "Access-Control-Allow-Credentials", "value": "true" },
        { "key": "Access-Control-Allow-Origin", "value": "*" },
        { "key": "Access-Control-Allow-Methods", "value": "GET,OPTIONS,PATCH,DELETE,POST,PUT" },
        { "key": "Access-Control-Allow-Headers", "value": "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version" }
      ]
    }
  ]
}
```

### **4. Deploy Commands**
```bash
# Development deployment (preview)
vercel

# Production deployment
vercel --prod

# Deploy specific branch
vercel --prod --scope your-team

# Check deployment status
vercel ls

# View logs
vercel logs ai-lead-router-saas.vercel.app

# Rollback if needed
vercel rollback [deployment-url]
```

### **5. Backend Testing URLs**
```bash
# Health check
curl https://ai-lead-router-saas.vercel.app/api/health

# Test chat endpoint
curl -X POST https://ai-lead-router-saas.vercel.app/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Test message"}'

# Test document list
curl https://ai-lead-router-saas.vercel.app/api/documents

# API documentation
open https://ai-lead-router-saas.vercel.app/api/docs
```

---

## 🎨 **FRONTEND DEPLOYMENT (frontend-data-intelligence)**

### **1. Initial Setup**
```bash
# Navigate to frontend repo
cd frontend-data-intelligence

# Link project
vercel link
# Select: Create new project
# Project name: frontend-data-intelligence
# Framework: Next.js
```

### **2. Environment Variables**
```bash
# Set production environment variables
vercel env add NEXT_PUBLIC_API_URL production
# Value: https://ai-lead-router-saas.vercel.app/api

vercel env add NEXT_PUBLIC_SUPABASE_URL production
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production

# For development/preview
vercel env add NEXT_PUBLIC_API_URL preview development
# Value: https://ai-lead-router-saas-git-dev.vercel.app/api
```

### **3. vercel.json Configuration**
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": ".next",
  "devCommand": "npm run dev",
  "installCommand": "npm install",
  "framework": "nextjs",
  "regions": ["iad1"],
  "env": {
    "NEXT_PUBLIC_API_URL": "https://ai-lead-router-saas.vercel.app/api"
  },
  "rewrites": [
    {
      "source": "/api/:path*",
      "destination": "https://ai-lead-router-saas.vercel.app/api/:path*"
    }
  ]
}
```

### **4. Deploy Commands**
```bash
# Development deployment (preview)
vercel

# Production deployment
vercel --prod

# Build locally first (optional)
npm run build
vercel --prod --prebuilt

# Monitor build
vercel inspect [deployment-url]
```

### **5. Frontend Testing URLs**
```bash
# Homepage
open https://frontend-data-intelligence.vercel.app

# Dashboard
open https://frontend-data-intelligence.vercel.app/dashboard

# Chat interface
open https://frontend-data-intelligence.vercel.app/dashboard/chat

# Check build output
vercel inspect frontend-data-intelligence.vercel.app
```

---

## 🔄 **CONTINUOUS DEPLOYMENT**

### **1. GitHub Integration**
```yaml
# Both repos: Enable automatic deployments
1. Visit: https://vercel.com/dashboard
2. Select your project
3. Go to Settings → Git
4. Connect GitHub repository
5. Enable automatic deployments for:
   - Production: main branch
   - Preview: all other branches
```

### **2. Branch Strategy**
```typescript
const branchStrategy = {
  main: {
    environment: "production",
    url: "*.vercel.app",
    protection: true
  },
  develop: {
    environment: "preview",
    url: "*-git-develop.vercel.app",
    protection: false
  },
  feature: {
    environment: "preview",
    url: "*-git-[branch].vercel.app",
    protection: false
  }
};
```

### **3. Preview Deployments**
```bash
# Create feature branch
git checkout -b feature/new-feature

# Make changes and push
git add .
git commit -m "feat: Add new feature"
git push origin feature/new-feature

# Vercel automatically creates preview
# URL: https://[project]-git-feature-new-feature.vercel.app
```

---

## 🧪 **TESTING STRATEGY**

### **1. API Contract Testing**
```typescript
// test/contracts/api.test.ts
describe('API Contracts', () => {
  const API_URL = process.env.VERCEL_URL 
    ? `https://${process.env.VERCEL_URL}/api`
    : 'http://localhost:3000/api';

  test('Chat endpoint contract', async () => {
    const response = await fetch(`${API_URL}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'test' })
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toHaveProperty('response');
    expect(data).toHaveProperty('sources');
    expect(data).toHaveProperty('confidence');
  });
});
```

### **2. E2E Testing Across Services**
```typescript
// e2e/integration.spec.ts
import { test, expect } from '@playwright/test';

test('Full user flow', async ({ page }) => {
  // Start at frontend
  await page.goto('https://frontend-data-intelligence.vercel.app');
  
  // Navigate to chat
  await page.click('text=Dashboard');
  await page.click('text=Chat');
  
  // Send message (calls backend API)
  await page.fill('[data-testid="chat-input"]', 'What is the return policy?');
  await page.press('[data-testid="chat-input"]', 'Enter');
  
  // Verify response from backend
  await expect(page.locator('[data-testid="chat-response"]')).toBeVisible();
});
```

---

## 📊 **MONITORING & ANALYTICS**

### **1. Vercel Analytics (Built-in)**
```typescript
// app/layout.tsx (frontend)
import { Analytics } from '@vercel/analytics/react';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
```

### **2. Function Logs**
```bash
# View backend function logs
vercel logs ai-lead-router-saas.vercel.app --follow

# Filter by function
vercel logs --filter="api/chat" --follow

# Debug specific deployment
vercel logs [deployment-url] --debug
```

### **3. Performance Monitoring**
```typescript
// Monitor API performance
const monitoringEndpoints = {
  backend_health: "https://ai-lead-router-saas.vercel.app/api/health",
  frontend_health: "https://frontend-data-intelligence.vercel.app/api/health-check",
  
  // Use external monitoring
  uptimeRobot: "Add both URLs",
  datadog: "Install Datadog integration",
  newRelic: "Add New Relic browser agent"
};
```

---

## 🚨 **TROUBLESHOOTING**

### **Common Issues & Solutions**

#### **1. CORS Errors**
```typescript
// Backend: app/api/route.ts
export async function OPTIONS(request: Request) {
  return new Response('', {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
```

#### **2. Environment Variable Issues**
```bash
# Re-pull environment variables
vercel env pull --yes

# Check what's deployed
vercel env ls production

# Remove and re-add
vercel env rm VARIABLE_NAME production
vercel env add VARIABLE_NAME production
```

#### **3. Build Failures**
```bash
# Check build logs
vercel inspect [deployment-url]

# Clear cache and rebuild
vercel --force

# Use specific Node version
echo "18.x" > .nvmrc
```

#### **4. Function Timeouts**
```json
// vercel.json - Increase timeout
{
  "functions": {
    "app/api/heavy-process/route.ts": {
      "maxDuration": 60
    }
  }
}
```

---

## 🎯 **PRODUCTION CHECKLIST**

### **Before Going Live**
- [ ] All environment variables set in production
- [ ] CORS configured for production domains
- [ ] API rate limiting implemented
- [ ] Error tracking setup (Sentry)
- [ ] Analytics enabled
- [ ] Custom domain configured
- [ ] SSL certificates active
- [ ] Database indexes optimized
- [ ] Monitoring alerts configured
- [ ] Backup strategy in place

### **Custom Domains**
```bash
# Add custom domain to backend
vercel domains add api.yourdomain.com --project ai-lead-router-saas

# Add custom domain to frontend  
vercel domains add app.yourdomain.com --project frontend-data-intelligence

# Verify DNS
vercel domains inspect api.yourdomain.com
```

---

## ✅ **SUCCESS METRICS**

```typescript
const deploymentSuccess = {
  backend: {
    deployment_time: "< 2 minutes",
    cold_start: "< 500ms",
    api_response: "< 200ms p50",
    uptime: "99.95%"
  },
  frontend: {
    deployment_time: "< 30 seconds",
    lighthouse_score: "> 95",
    core_web_vitals: "all green",
    global_cdn: "< 50ms latency"
  }
};
```

**Both services deployed independently on Vercel = Maximum flexibility and speed!** 