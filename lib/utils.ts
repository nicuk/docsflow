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
