import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Multi-tenant configuration with fallback
export const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http'
export const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'ai-lead-router-saas.vercel.app'

// Debug logging for production
if (process.env.NODE_ENV === 'production') {
  console.log('Root domain configuration:', {
    NEXT_PUBLIC_ROOT_DOMAIN: process.env.NEXT_PUBLIC_ROOT_DOMAIN,
    rootDomain,
    protocol
  });
}

// CORS configuration for proper single-origin handling
const ALLOWED_ORIGINS = [
  'https://v0-ai-saas-s-landing-page-1w.vercel.app',
  'https://v0-ai-saa-s-landing-page-lqwq5hx4s-nics-projects-4e604dbf.vercel.app', // Current Vercel preview URL
  'https://docsflow.app',
  'https://www.docsflow.app',
  'http://localhost:3000',
  'http://localhost:3001'
];

// Dynamic CORS headers that comply with browser standards
export function getCORSHeaders(origin?: string | null): Record<string, string> {
  const isAllowedOrigin = origin && ALLOWED_ORIGINS.includes(origin);
  const allowedOrigin = isAllowedOrigin ? origin : (process.env.NODE_ENV === 'production' ? 'https://www.docsflow.app' : '*');
  
  console.log('CORS Origin Check:', { origin, isAllowedOrigin, allowedOrigin }); // Debug logging
  
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Tenant-ID, X-Requested-With, Accept',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Max-Age': '86400',
  };
}

// Legacy export for backward compatibility (deprecated)
export const CORS_HEADERS = getCORSHeaders();
