/**
 * SERVER CLIENT - For use in API routes and Server Components only
 */
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

/**
 * SERVER CLIENT - For use in API routes and Server Components
 */
export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              // CRITICAL FIX: Set domain to .docsflow.app for cross-subdomain cookies
              const cookieOptions = {
                ...options,
                domain: '.docsflow.app', // This allows cookies to work on bitto.docsflow.app AND api.docsflow.app
                secure: true,
                sameSite: 'lax' as const
              }
              cookieStore.set(name, value, cookieOptions)
            })
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  )
}

/**
 * MIDDLEWARE CLIENT - For use in middleware.ts
 */
export function createMiddlewareClient(request: NextRequest, response: NextResponse) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            // CRITICAL FIX: Set domain to .docsflow.app for cross-subdomain cookies
            const cookieOptions = {
              ...options,
              domain: '.docsflow.app', // This allows cookies to work on bitto.docsflow.app AND api.docsflow.app
              secure: true,
              sameSite: 'lax' as const
            }
            request.cookies.set(name, value)
            response.cookies.set(name, value, cookieOptions)
          })
        },
      },
    }
  )
}
