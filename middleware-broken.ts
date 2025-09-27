import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value)
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  const { pathname } = request.nextUrl
  
  // Get user session (establishes auth.uid() for RLS)
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  
  // Debug logging for auth state
  console.log(`🔍 [MIDDLEWARE] Auth check for ${pathname}:`, {
    hasUser: !!user,
    userEmail: user?.email,
    userError: userError?.message,
    cookieCount: request.cookies.getAll().length
  })
  const hostname = request.headers.get('host') || ''

  // Skip static files
    if (pathname.startsWith('/_next') || 
        pathname.startsWith('/favicon') ||
        pathname.endsWith('.ico') ||
        pathname.endsWith('.svg') ||
      pathname.endsWith('.png')) {
    return response
  }

  // Extract tenant from subdomain (enhanced for development)
  let tenant = null
  
  if (hostname.includes('.') && !hostname.startsWith('www.')) {
    // Production subdomain: tenant.docsflow.app
    if (hostname.includes('docsflow.app')) {
      tenant = hostname.split('.')[0]
    }
  }
  
  // For development on localhost, check if user has a tenant and use it as default
  if (!tenant && hostname.includes('localhost') && user) {
    // Fallback: use the user's tenant for localhost testing
    try {
      const { data: userData } = await supabase
        .from('users')
        .select('tenants(subdomain)')
        .eq('id', user.id)
        .single()
      
      if (userData?.tenants?.subdomain) {
        tenant = userData.tenants.subdomain
        console.log(`🔧 [LOCALHOST] Using user's tenant: ${tenant}`)
                }
              } catch (e) {
      console.log('Failed to get user tenant for localhost')
    }
  }

  // Public routes (no auth required)
  const publicRoutes = ['/login', '/register', '/forgot-password', '/', '/pricing', '/about']
  const isPublicRoute = publicRoutes.some(route => pathname === route || pathname.startsWith('/api/auth'))

  // If user is not authenticated and trying to access protected route
  if (!user && !isPublicRoute) {
    const loginUrl = tenant ? `https://${tenant}.docsflow.app/login` : `${request.nextUrl.origin}/login`
    return NextResponse.redirect(loginUrl)
  }

  // Set tenant context headers for authenticated users
  if (user) {
    if (tenant) {
      response.headers.set('x-tenant-subdomain', tenant)
      
      // Get tenant UUID
      try {
        const { data: tenantData } = await supabase
          .from('tenants')
          .select('id')
          .eq('subdomain', tenant)
          .single()
        
        if (tenantData?.id) {
          response.headers.set('x-tenant-id', tenantData.id)
          console.log(`✅ [MIDDLEWARE] Tenant context set: ${tenant} (${tenantData.id.substring(0, 8)}...)`)
        }
        } catch (e) {
        console.log('Tenant lookup failed:', e)
        }
      } else {
      // No tenant found - this might be a main domain request
      // For localhost development, try to get user's tenant directly
      try {
        const { data: userData } = await supabase
          .from('users')
          .select('tenant_id, tenants(subdomain)')
          .eq('id', user.id)
          .single()
        
        if (userData?.tenant_id && userData?.tenants?.subdomain) {
          response.headers.set('x-tenant-id', userData.tenant_id)
          response.headers.set('x-tenant-subdomain', userData.tenants.subdomain)
          console.log(`🔧 [FALLBACK] Set tenant headers from user profile: ${userData.tenants.subdomain}`)
                }
              } catch (e) {
        console.log('User tenant lookup failed:', e)
      }
    }
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
