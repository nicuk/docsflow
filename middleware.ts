import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

// Define routes that require authentication
const isProtectedRoute = createRouteMatcher([
  '/dashboard(.*)',
  '/onboarding(.*)',
  '/chat(.*)',
  '/documents(.*)',
])

// Define public routes (no auth required)
const isPublicRoute = createRouteMatcher([
  '/login(.*)',
  '/signup(.*)',
  '/auth(.*)',
  '/',
  '/api/webhooks(.*)', // Allow webhooks without auth
])

export default clerkMiddleware(async (auth, req) => {
  const { userId, sessionClaims } = await auth()
  
  // Protect routes that require authentication
  if (isProtectedRoute(req) && !userId) {
    const loginUrl = new URL('/login', req.url)
    return NextResponse.redirect(loginUrl)
  }

  // Extract tenant from subdomain for multi-tenant routing
  const { hostname } = req.nextUrl
  let tenant = null
  
  // Production: tenant.docsflow.app
  if (hostname.includes('docsflow.app') && !hostname.startsWith('www.')) {
    tenant = hostname.split('.')[0]
  }
  
  // Development: localhost (we'll get tenant from user metadata after auth)
  if (hostname.includes('localhost')) {
    tenant = 'localhost-dev'
  }

  // Add tenant context to headers for API routes
  const response = NextResponse.next()
  if (tenant) {
    response.headers.set('x-tenant-subdomain', tenant)
  }
  if (userId) {
    response.headers.set('x-user-id', userId)
  }

  return response
})

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
