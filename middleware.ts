import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { TenantContextManager } from '@/lib/tenant-context-manager'

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

// Define admin routes (require Basic Auth)
const isAdminRoute = createRouteMatcher([
  '/dashboard/admin(.*)',
])

export default clerkMiddleware(async (auth, req) => {
  const { userId, sessionClaims } = await auth()
  
  // 🔐 HTTP Basic Auth for Admin Routes (additional security layer)
  if (isAdminRoute(req)) {
    const basicAuth = req.headers.get('authorization')
    
    if (basicAuth) {
      const authValue = basicAuth.split(' ')[1]
      const [user, pwd] = Buffer.from(authValue, 'base64').toString().split(':')
      
      const validUser = process.env.ADMIN_AUTH_USERNAME
      const validPassword = process.env.ADMIN_AUTH_PASSWORD
      
      if (user === validUser && pwd === validPassword) {
        // Basic Auth successful, continue to Clerk auth
        // (Don't return here, let it continue to Clerk checks below)
      } else {
        // Invalid credentials
        return new NextResponse('Invalid credentials', {
          status: 401,
          headers: { 'WWW-Authenticate': 'Basic realm="Admin Area"' },
        })
      }
    } else {
      // No auth header, require Basic Auth
      return new NextResponse('Authentication required', {
        status: 401,
        headers: { 'WWW-Authenticate': 'Basic realm="Admin Area"' },
      })
    }
  }
  
  // Protect routes that require authentication
  if (isProtectedRoute(req) && !userId) {
    const loginUrl = new URL('/login', req.url)
    return NextResponse.redirect(loginUrl)
  }

  // Extract tenant from subdomain for multi-tenant routing
  const { hostname } = req.nextUrl
  let tenant = null
  let tenantId = null
  
  // 🎯 SURGICAL FIX: Skip tenant lookup for special subdomains
  const specialSubdomains = ['api', 'www', 'm', 'admin', 'app', 'clerk']
  
  // Production: tenant.docsflow.app
  if (hostname.includes('docsflow.app') && !hostname.startsWith('www.')) {
    const subdomain = hostname.split('.')[0]
    // Only treat as tenant if NOT a special subdomain
    if (!specialSubdomains.includes(subdomain)) {
      tenant = subdomain
    }
  }
  
  // Development: localhost (we'll get tenant from user metadata after auth)
  if (hostname.includes('localhost')) {
    tenant = 'localhost-dev'
  }

  // Resolve tenant UUID from subdomain (cached in Redis)
  if (tenant && tenant !== 'localhost-dev' && tenant !== 'docsflow') {
    try {
      const tenantInfo = await TenantContextManager.resolveTenant(tenant)
      if (tenantInfo) {
        tenantId = tenantInfo.uuid
      }
    } catch (error) {
      console.error(`[Middleware] Failed to resolve tenant ${tenant}:`, error)
    }
  }

  // Add tenant context to headers for API routes
  const response = NextResponse.next()
  if (tenant) {
    response.headers.set('x-tenant-subdomain', tenant)
  }
  if (tenantId) {
    response.headers.set('x-tenant-id', tenantId)
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
