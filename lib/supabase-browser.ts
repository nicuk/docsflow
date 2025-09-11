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
          // 🛡️ CRITICAL FIX: Server-side safety check
          if (typeof document === 'undefined') {
            console.warn('🔍 [SUPABASE-BROWSER] Server-side context - returning empty cookies');
            return [];
          }
          
          return document.cookie
            .split(';')
            .map(cookie => cookie.trim().split('='))
            .map(([name, value]) => ({ name, value: decodeURIComponent(value || '') }))
        },
        setAll(cookiesToSet) {
          // 🛡️ CRITICAL FIX: Server-side safety check
          if (typeof document === 'undefined') {
            console.warn('🔍 [SUPABASE-BROWSER] Server-side context - cannot set cookies');
            return;
          }
          
          cookiesToSet.forEach(({ name, value, options }) => {
            // CRITICAL FIX: Set domain to .docsflow.app for cross-subdomain cookies
            const cookieOptions = {
              ...options,
              domain: '.docsflow.app', // This allows cookies to work on bitto.docsflow.app AND api.docsflow.app
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
