import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

/**
 * Clerk Test Middleware
 * 
 * ISOLATED - Only affects /dashboard-clerk routes
 * Does NOT interfere with existing middleware.ts
 * 
 * This is for Phase 2 testing only
 */

// Only protect Clerk test routes
const isClerkProtectedRoute = createRouteMatcher([
  '/dashboard-clerk(.*)',
])

export default clerkMiddleware((auth, req) => {
  const { pathname } = req.nextUrl

  // Only apply Clerk auth to /dashboard-clerk routes
  if (isClerkProtectedRoute(req)) {
    auth().protect()
  }

  // Extract tenant from subdomain (for future multi-tenant support)
  const hostname = req.headers.get('host') || ''
  let tenant = null
  
  if (hostname.includes('.') && !hostname.startsWith('www.')) {
    if (hostname.includes('docsflow.app')) {
      tenant = hostname.split('.')[0]
    }
  }

  const response = NextResponse.next()
  
  if (tenant) {
    response.headers.set('x-tenant-subdomain', tenant)
  }

  return response
})

export const config = {
  // Only match Clerk test routes
  matcher: [
    '/dashboard-clerk(.*)',
    '/sign-in(.*)',
    '/sign-up(.*)',
  ],
}
