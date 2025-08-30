import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Domain and protocol configuration for monorepo deployment
export const rootDomain = process.env.NODE_ENV === 'production' ? 'docsflow.app' : 'localhost:3000'
export const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http'

// CORS headers for API routes with comprehensive subdomain support
export function getCORSHeaders(origin?: string | null): HeadersInit {
  // Allow all docsflow subdomains with regex pattern matching
  const allowedOrigins = [
    'https://docsflow.app',
    'https://www.docsflow.app',
    'https://api.docsflow.app',
    /^https:\/\/[a-zA-Z0-9-]+\.docsflow\.app$/, // Regex for all subdomains
    // Development origins
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:3003',
  ];

  let allowOrigin = 'https://docsflow.app'; // Secure default - no wildcard!
  
  if (origin) {
    // Check if origin matches any allowed pattern
    const isAllowed = allowedOrigins.some(allowed => {
      if (allowed instanceof RegExp) {
        return allowed.test(origin);
      }
      return allowed === origin;
    });
    
    if (isAllowed) {
      allowOrigin = origin;
    }
  }

  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, PATCH',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Tenant-ID, X-Tenant-Subdomain, X-Requested-With, Accept',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Max-Age': '86400', // Cache preflight for 24 hours
  };
}
