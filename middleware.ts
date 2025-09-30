import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  // PHASE 2: Check Clerk routes FIRST, before any Supabase logic
  const isClerkTestRoute = request.nextUrl.pathname.startsWith('/sign-in-clerk') ||
                           request.nextUrl.pathname.startsWith('/sign-up-clerk') ||
                           request.nextUrl.pathname.startsWith('/dashboard-clerk');

  if (isClerkTestRoute) {
    // Let Clerk handle these routes completely - skip all Supabase middleware
    return NextResponse.next()
  }

  // Only run Supabase auth logic for non-Clerk routes
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name) {
          return request.cookies.get(name)?.value;
        },
        set(name, value, options) {
          // SURGICAL FIX: Match login API cookie domain
          const enhancedOptions = {
            ...options,
            domain: process.env.NODE_ENV === 'production' ? '.docsflow.app' : '.localhost',
            path: '/',
            sameSite: 'lax' as const,
            secure: process.env.NODE_ENV === 'production'
          };
          request.cookies.set(name, value)
          supabaseResponse.cookies.set(name, value, enhancedOptions)
        },
        remove(name, options) {
          request.cookies.delete(name)
          supabaseResponse.cookies.set(name, '', { ...options, maxAge: 0 })
        },
      },
    }
  )

  // IMPORTANT: Avoid writing any logic between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (
    !user &&
    !request.nextUrl.pathname.startsWith('/login') &&
    !request.nextUrl.pathname.startsWith('/auth') &&
    !request.nextUrl.pathname.startsWith('/api/')
  ) {
    // no user, potentially respond by redirecting the user to the login page
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // IMPORTANT: You *must* return the supabaseResponse object as it is. If you're
  // creating a new response object with NextResponse.next() make sure to:
  // 1. Pass the request in it, like so:
  //    const myNewResponse = NextResponse.next({ request })
  // 2. Copy over the cookies, like so:
  //    myNewResponse.cookies.set(supabaseResponse.cookies)
  // 3. Change the myNewResponse object instead of the supabaseResponse object

  return supabaseResponse
}

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
