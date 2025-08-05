import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Domain and protocol utilities for monorepo
export const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'docsflow.app';
export const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';

// CORS headers for API routes
export function getCORSHeaders(origin?: string | null) {
  const allowedOrigins = [
    'https://docsflow.app',
    'https://www.docsflow.app',
    'http://localhost:3000',
    'http://localhost:3001'
  ];

  const isAllowedOrigin = origin && allowedOrigins.includes(origin);
  
  return {
    'Access-Control-Allow-Origin': isAllowedOrigin ? origin : 'https://docsflow.app',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
    'Access-Control-Allow-Credentials': 'true'
  };
}
