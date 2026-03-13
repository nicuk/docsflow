/**
 * BROWSER CLIENT - For use in Client Components only
 */
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          if (typeof document === 'undefined') {
            return [];
          }
          
          return document.cookie
            .split(';')
            .map(cookie => cookie.trim().split('='))
            .map(([name, value]) => ({ name, value: decodeURIComponent(value || '') }))
        },
        setAll(cookiesToSet) {
          if (typeof document === 'undefined') {
            return;
          }
          
          cookiesToSet.forEach(({ name, value, options }) => {
            const cookieOptions = {
              ...options,
              domain: '.docsflow.app', // Shared cookie domain across tenant subdomains
              secure: true,
              sameSite: 'lax'
            }
            
            let cookieString = `${name}=${encodeURIComponent(value)}`
            
            if (cookieOptions.maxAge) cookieString += `; max-age=${cookieOptions.maxAge}`
            if (cookieOptions.expires) cookieString += `; expires=${cookieOptions.expires.toUTCString()}`
            if (cookieOptions.path) cookieString += `; path=${cookieOptions.path}`
            if (cookieOptions.domain) cookieString += `; domain=${cookieOptions.domain}`
            if (cookieOptions.secure) cookieString += `; secure`
            if (cookieOptions.sameSite) cookieString += `; samesite=${cookieOptions.sameSite}`
            if (cookieOptions.httpOnly) cookieString += `; httponly`
            
            document.cookie = cookieString
          })
        },
      }
    }
  )
}
