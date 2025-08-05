import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Multi-tenant configuration with fallback
export const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http'
export const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'docsflow.app'

// CORS configuration for proper single-origin handling
const ALLOWED_ORIGINS = [
  // 🏗️ PRODUCTION DOMAINS
  'https://docsflow.app',
  'https://www.docsflow.app',
  'https://app.docsflow.app',
  'https://api.docsflow.app',
  
  // 🧪 DEVELOPMENT & STAGING DOMAINS
  'https://v0-ai-saas-s-landing-page-1w.vercel.app',
  'https://v0-ai-saa-s-landing-page-lqwq5hx4s-nics-projects-4e604dbf.vercel.app',
  'https://frontend-data-intelligence.vercel.app',
  'https://frontend-data-intelligence-git-main-nics-projects-4e604dbf.vercel.app',
  'http://localhost:3000',
  'http://localhost:3001'
];

// Dynamic CORS headers that comply with browser standards
export function getCORSHeaders(origin?: string | null): Record<string, string> {
  // Check if origin is from an allowed domain or subdomain
  let isAllowedOrigin = false;
  let allowedOrigin = '*';
  
  if (origin) {
    // Check exact matches first
    if (ALLOWED_ORIGINS.includes(origin)) {
      isAllowedOrigin = true;
    } else {
      // Check if it's a subdomain of docsflow.app
      const docsflowRegex = /^https:\/\/[a-zA-Z0-9-]+\.docsflow\.app$/;
      if (docsflowRegex.test(origin)) {
        isAllowedOrigin = true;
      }
    }
    
    if (isAllowedOrigin) {
      allowedOrigin = origin;
    }
  }
  
  // Only log in development to avoid build noise
  if (process.env.NODE_ENV === 'development') {
  
  }
  
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Tenant-ID, X-Tenant-Subdomain, X-Requested-With, Accept',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Max-Age': '86400',
  };
}

// Legacy export for backward compatibility (deprecated)
export const CORS_HEADERS = getCORSHeaders();
