import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Domain and protocol configuration for monorepo deployment
export const rootDomain = process.env.NODE_ENV === 'production' ? 'docsflow.app' : 'localhost:3000'
export const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http'

// CORS headers for API routes
export function getCORSHeaders(origin?: string | null) {
  return {
    'Access-Control-Allow-Origin': origin || '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  }
}
